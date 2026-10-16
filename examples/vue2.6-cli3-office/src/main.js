import 'babel-polyfill'
import Vue from 'vue'
import ElementUI from 'element-ui'
import Antd from 'ant-design-vue'
import 'element-ui/lib/theme-chalk/index.css'
import 'ant-design-vue/dist/antd.css'
import FileViewer from '@file-viewer/vue2.6'
import App from './App.vue'

Vue.config.productionTip = false
Vue.use(ElementUI)
Vue.use(Antd)
Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
