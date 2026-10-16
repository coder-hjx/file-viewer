import * as THREE from 'three';
import type {
  GeometryKernelFace,
  GeometryKernelImportResult,
  GeometryKernelMesh,
  GeometryKernelNode,
} from '@file-viewer/geometry-engine';

export interface OcctThreeObjectStats {
  meshCount: number;
  nodeCount: number;
  triangleCount: number;
  vertexCount: number;
}

export interface OcctThreeObjectResult {
  object: THREE.Group;
  stats: OcctThreeObjectStats;
}

const DEFAULT_SURFACE_COLOR = new THREE.Color(0x4f8fba);

const readColor = (value?: readonly number[] | null) => {
  if (!value || value.length < 3) {
    return DEFAULT_SURFACE_COLOR.clone();
  }
  const components = value.slice(0, 3).map(Number);
  if (components.some(component => !Number.isFinite(component))) {
    return DEFAULT_SURFACE_COLOR.clone();
  }
  const [red, green, blue] = components.map(component => THREE.MathUtils.clamp(component, 0, 1));
  return new THREE.Color(red, green, blue);
};

const createMaterial = (color: THREE.Color, wireframe: boolean) => new THREE.MeshStandardMaterial({
  color,
  metalness: 0.06,
  roughness: 0.72,
  side: THREE.DoubleSide,
  wireframe,
});

const hasOnlyFiniteNumbers = (values: ArrayLike<number>) => {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(Number(values[index]))) {
      return false;
    }
  }
  return true;
};

const normalizeFaces = (faces: GeometryKernelFace[] | undefined, triangleCount: number) => {
  return (faces || [])
    .map(face => ({
      ...face,
      first: Math.max(0, Math.floor(Number(face.first))),
      last: Math.min(triangleCount - 1, Math.floor(Number(face.last))),
    }))
    .filter(face => face.first <= face.last && face.first < triangleCount)
    .sort((left, right) => left.first - right.first);
};

const buildGeometry = (source: GeometryKernelMesh) => {
  const sourcePositions = source.attributes?.position?.array || [];
  const sourceIndices = source.index?.array || [];
  if (sourcePositions.length < 9 || sourcePositions.length % 3 !== 0) {
    throw new Error(`OCCT mesh ${source.name || '(unnamed)'} has invalid vertex data.`);
  }
  if (!hasOnlyFiniteNumbers(sourcePositions)) {
    throw new Error(`OCCT mesh ${source.name || '(unnamed)'} has invalid vertex data.`);
  }
  if (sourceIndices.length < 3 || sourceIndices.length % 3 !== 0) {
    throw new Error(`OCCT mesh ${source.name || '(unnamed)'} has invalid triangle data.`);
  }
  const vertexCount = sourcePositions.length / 3;
  for (let index = 0; index < sourceIndices.length; index += 1) {
    const vertexIndex = Number(sourceIndices[index]);
    if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertexCount) {
      throw new Error(`OCCT mesh ${source.name || '(unnamed)'} has an invalid triangle index.`);
    }
  }
  const positions = Float32Array.from(sourcePositions);
  const indices = Uint32Array.from(sourceIndices);

  const geometry = new THREE.BufferGeometry();
  geometry.name = source.name || '';
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const normals = source.attributes?.normal?.array;
  const hasValidNormals = normals &&
    normals.length === positions.length &&
    hasOnlyFiniteNumbers(normals);
  if (hasValidNormals) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Float32Array.from(normals), 3));
  } else {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const buildMaterials = (
  geometry: THREE.BufferGeometry,
  source: GeometryKernelMesh,
  wireframe: boolean
) => {
  const baseColor = readColor(source.color);
  const materials: THREE.MeshStandardMaterial[] = [createMaterial(baseColor, wireframe)];
  const materialByColor = new Map<string, number>();
  const triangleCount = (geometry.index?.count || 0) / 3;
  const faces = normalizeFaces(source.brep_faces, triangleCount);
  if (!faces.length) {
    return materials;
  }

  let cursor = 0;
  for (const face of faces) {
    if (face.first > cursor) {
      geometry.addGroup(cursor * 3, (face.first - cursor) * 3, 0);
    }
    const faceColor = face.color ? readColor(face.color) : baseColor;
    const colorKey = face.color ? faceColor.getHexString() : 'base';
    let materialIndex = colorKey === 'base' ? 0 : materialByColor.get(colorKey);
    if (materialIndex === undefined) {
      materialIndex = materials.length;
      materialByColor.set(colorKey, materialIndex);
      materials.push(createMaterial(faceColor, wireframe));
    }
    const start = Math.max(cursor, face.first);
    if (face.last >= start) {
      geometry.addGroup(start * 3, (face.last - start + 1) * 3, materialIndex);
      cursor = face.last + 1;
    }
  }
  if (cursor < triangleCount) {
    geometry.addGroup(cursor * 3, (triangleCount - cursor) * 3, 0);
  }
  return materials;
};

const createMeshFactory = (source: GeometryKernelMesh, wireframe: boolean) => {
  const geometry = buildGeometry(source);
  const materials = buildMaterials(geometry, source, wireframe);
  return () => {
    const mesh = new THREE.Mesh(geometry, materials.length === 1 ? materials[0] : materials);
    mesh.name = source.name || '';
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  };
};

export const buildOcctThreeObject = (
  result: GeometryKernelImportResult,
  wireframe = false
): OcctThreeObjectResult => {
  if (!result.success || !result.meshes.length) {
    throw new Error('The OpenCascade result does not contain renderable geometry.');
  }

  const meshFactories = result.meshes.map(mesh => createMeshFactory(mesh, wireframe));
  const referencedMeshes = new Set<number>();
  let nodeCount = 0;

  const buildNode = (node: GeometryKernelNode): THREE.Group => {
    const group = new THREE.Group();
    group.name = node.name || '';
    nodeCount += 1;
    for (const meshIndex of node.meshes || []) {
      const factory = meshFactories[meshIndex];
      if (!factory) {
        continue;
      }
      referencedMeshes.add(meshIndex);
      group.add(factory());
    }
    for (const child of node.children || []) {
      group.add(buildNode(child));
    }
    return group;
  };

  const object = result.root
    ? buildNode(result.root)
    : new THREE.Group();
  object.name ||= 'OCCT model';

  const unassigned = new THREE.Group();
  unassigned.name = 'Unassigned geometry';
  meshFactories.forEach((factory, index) => {
    if (!referencedMeshes.has(index)) {
      unassigned.add(factory());
    }
  });
  if (unassigned.children.length) {
    nodeCount += 1;
    object.add(unassigned);
  }

  // STEP/IGES mechanical models conventionally use Z-up, while the shared
  // Three.js stage uses Y-up. Keep the grid and orbit controls intuitive.
  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);

  const stats: OcctThreeObjectStats = {
    meshCount: 0,
    nodeCount,
    triangleCount: 0,
    vertexCount: 0,
  };
  object.traverse(child => {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry>;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) {
      return;
    }
    stats.meshCount += 1;
    stats.vertexCount += mesh.geometry.getAttribute('position').count;
    stats.triangleCount += (mesh.geometry.index?.count || 0) / 3;
  });
  if (!stats.meshCount) {
    throw new Error('The OpenCascade hierarchy does not reference any renderable meshes.');
  }
  object.userData.fileViewerGeometryStats = stats;
  return { object, stats };
};
