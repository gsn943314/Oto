// voiceinput-helper: the part of VoiceInput that has to be native.
//
// It runs as a child of the app (so macOS counts it under VoiceInput's Accessibility permission) and talks
// over stdin/stdout, one JSON object per line:
//
//   in   {"cmd":"setTrigger","key":"control"|"fn"|"rightOption"|"off"}
//        {"cmd":"paste","id":1}          paste the clipboard into the focused field of the frontmost app
//        {"cmd":"trust","prompt":true}   report (and optionally ask for) Accessibility permission
//   out  {"event":"ready","trusted":true}
//        {"event":"tap"}                 the trigger key was pressed and released on its own
//        {"event":"pasted","id":1,"result":"pasted"|"noField"|"ownWindow","app":"Slack"}
//        {"event":"trust","trusted":false}
//
// A "tap" is the key going down and up within half a second with nothing else in between: no other key, no
// other modifier, no click. So Control-C, Control-click and holding Control all stay what they were.

import AppKit
import ApplicationServices

setvbuf(stdout, nil, _IOLBF, 0)

func send(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object),
          let line = String(data: data, encoding: .utf8) else { return }
    print(line)
}

// MARK: - Trigger key

enum Trigger: String {
    case control, fn, rightOption, off

    var keyCodes: Set<UInt16> {
        switch self {
        case .control: return [59, 62]        // left, right Control
        case .fn: return [63, 179]            // fn / globe
        case .rightOption: return [61]
        case .off: return []
        }
    }

    var flag: NSEvent.ModifierFlags {
        switch self {
        case .control: return .control
        case .fn: return .function
        case .rightOption: return .option
        case .off: return []
        }
    }
}

final class TapDetector {
    var trigger: Trigger = .control
    private var downAt: TimeInterval?
    private var monitors: [Any] = []
    private let maxTap: TimeInterval = 0.45

    private let relevant: NSEvent.ModifierFlags = [.control, .option, .command, .shift, .function]

    func install() {
        guard monitors.isEmpty else { return }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged, handler: { [weak self] e in self?.flagsChanged(e) }) {
            monitors.append(m)
        }
        // anything else while the key is held means it's part of a combination, not a tap
        if let m = NSEvent.addGlobalMonitorForEvents(matching: [.keyDown, .leftMouseDown, .rightMouseDown, .otherMouseDown, .scrollWheel], handler: { [weak self] _ in self?.downAt = nil }) {
            monitors.append(m)
        }
    }

    private func flagsChanged(_ e: NSEvent) {
        guard trigger != .off else { return }
        let flags = e.modifierFlags.intersection(relevant)

        if trigger.keyCodes.contains(e.keyCode) {
            // fn also rides along with arrow and function keys; only the bare key counts
            let others = flags.subtracting(trigger.flag)
            if flags.contains(trigger.flag) {
                downAt = others.isEmpty ? e.timestamp : nil
            } else if let start = downAt {
                downAt = nil
                if e.timestamp - start <= maxTap && others.isEmpty {
                    send(["event": "tap"])
                }
            }
        } else {
            downAt = nil // another modifier joined in
        }
    }
}

// MARK: - Paste

let editableRoles: Set<String> = [
    kAXTextFieldRole as String, kAXTextAreaRole as String, kAXComboBoxRole as String,
    "AXSearchField", "AXSecureTextField",
]

/// Whether the focused element of the frontmost app takes typed text.
/// nil means the app doesn't say (no accessibility tree); then pasting is still worth a try.
func focusedFieldIsEditable(pid: pid_t) -> Bool? {
    let appElement = AXUIElementCreateApplication(pid)
    // Chromium and Electron apps build their accessibility tree only when asked to
    AXUIElementSetAttributeValue(appElement, "AXManualAccessibility" as CFString, kCFBooleanTrue)

    var focused: CFTypeRef?
    guard AXUIElementCopyAttributeValue(appElement, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
          let element = focused, CFGetTypeID(element) == AXUIElementGetTypeID() else {
        return nil
    }
    let el = element as! AXUIElement

    var role: CFTypeRef?
    AXUIElementCopyAttributeValue(el, kAXRoleAttribute as CFString, &role)
    if let r = role as? String, editableRoles.contains(r) { return true }

    // contenteditable areas and custom editors: a settable value, or a text selection, means typing goes there
    var settable: DarwinBoolean = false
    if AXUIElementIsAttributeSettable(el, kAXValueAttribute as CFString, &settable) == .success, settable.boolValue {
        return true
    }
    var range: CFTypeRef?
    if AXUIElementCopyAttributeValue(el, kAXSelectedTextRangeAttribute as CFString, &range) == .success, range != nil {
        return true
    }
    return false
}

func pressCommandV() {
    let source = CGEventSource(stateID: .combinedSessionState)
    let vKey: CGKeyCode = 9
    let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true)
    let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false)
    down?.flags = .maskCommand
    up?.flags = .maskCommand
    down?.post(tap: .cghidEventTap)
    up?.post(tap: .cghidEventTap)
}

func paste(id: Any) {
    guard let app = NSWorkspace.shared.frontmostApplication else {
        send(["event": "pasted", "id": id, "result": "noField"])
        return
    }
    let name = app.localizedName ?? ""
    // the parent app's own window has focus: the text is already in front of the user
    if app.processIdentifier == getppid() {
        send(["event": "pasted", "id": id, "result": "ownWindow", "app": name])
        return
    }
    if focusedFieldIsEditable(pid: app.processIdentifier) == false {
        send(["event": "pasted", "id": id, "result": "noField", "app": name])
        return
    }
    pressCommandV()
    send(["event": "pasted", "id": id, "result": "pasted", "app": name])
}

// MARK: - Main loop

let detector = TapDetector()
var announcedTrust = AXIsProcessTrusted()

func installIfTrusted() {
    if AXIsProcessTrusted() { detector.install() }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

installIfTrusted()
send(["event": "ready", "trusted": announcedTrust])

// Permission can be granted while running; start listening as soon as it is, and say so
Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { _ in
    let trusted = AXIsProcessTrusted()
    if trusted != announcedTrust {
        announcedTrust = trusted
        installIfTrusted()
        send(["event": "trust", "trusted": trusted])
    }
}

var buffer = Data()
FileHandle.standardInput.readabilityHandler = { handle in
    let chunk = handle.availableData
    if chunk.isEmpty { exit(0) } // the app went away
    DispatchQueue.main.async {
        buffer.append(chunk)
        while let nl = buffer.firstIndex(of: 0x0A) {
            let line = buffer.subdata(in: buffer.startIndex..<nl)
            buffer.removeSubrange(buffer.startIndex...nl)
            guard let msg = try? JSONSerialization.jsonObject(with: line) as? [String: Any],
                  let cmd = msg["cmd"] as? String else { continue }
            switch cmd {
            case "setTrigger":
                detector.trigger = Trigger(rawValue: msg["key"] as? String ?? "") ?? .control
            case "paste":
                paste(id: msg["id"] ?? 0)
            case "trust":
                let prompt = msg["prompt"] as? Bool ?? false
                let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: prompt] as CFDictionary
                let trusted = AXIsProcessTrustedWithOptions(options)
                announcedTrust = trusted
                installIfTrusted()
                send(["event": "trust", "trusted": trusted])
            default:
                break
            }
        }
    }
}

app.run()
