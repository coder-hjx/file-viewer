import XCTest

final class DemoOnboardingTests: XCTestCase {
    func testWelcomeAndMobileEntriesInSafari() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        let close = safari.buttons["Close welcome card"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 60), safari.debugDescription)
        XCTAssertTrue(close.isHittable)
        XCTAssertTrue(safari.buttons["Choose a local file"].firstMatch.isHittable)
        XCTAssertTrue(safari.buttons["Browse all samples"].firstMatch.isHittable)
        capture(safari, "welcome")
        close.tap()

        let upload = safari.buttons["Upload a local file"].firstMatch
        let samples = safari.buttons["Open sample files"].firstMatch
        XCTAssertTrue(upload.waitForExistence(timeout: 15))
        XCTAssertTrue(upload.isHittable)
        XCTAssertTrue(samples.isHittable)
        XCTAssertGreaterThanOrEqual(upload.frame.height, 44)
        XCTAssertFalse(upload.frame.intersects(samples.frame))
        capture(safari, "mobile-primary-entries")
        samples.tap()
        XCTAssertTrue(safari.staticTexts["Sample library"].firstMatch.waitForExistence(timeout: 15))
        let nasa = safari.buttons.matching(NSPredicate(format: "label CONTAINS 'NASA'")).firstMatch
        XCTAssertTrue(nasa.waitForExistence(timeout: 15))
        XCTAssertTrue(nasa.isHittable)
        capture(safari, "sample-library")
        let closePanel = safari.buttons.matching(identifier: "Close control panel").allElementsBoundByIndex.first { $0.isHittable }
        XCTAssertNotNil(closePanel)
        closePanel?.tap()
        XCTAssertTrue(upload.isHittable)
        upload.tap()
        XCTAssertTrue(safari.staticTexts["Choose a file"].firstMatch.waitForExistence(timeout: 15))
        capture(safari, "local-file-panel")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
