import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export default class MicButtonExtension extends Extension {
  enable() {
    this._recording = false;

    // Create the panel button
    this._button = new PanelMenu.Button(0.0, 'MicButton', false);

    // Create the icon
    this._icon = new St.Icon({
      gicon: Gio.icon_new_for_string(`${this.path}/icons/mic-off.png`),
      style_class: 'system-status-icon',
    });

    // Add icon to the button
    this._button.add_child(this._icon);
    this._button.connect('button-press-event', () => this._toggleMic());

    // Add to status area (position 0 for right side)
    Main.panel.addToStatusArea('mic-button', this._button, 0, 'right');

    // Initialize clipboard
    this._clipboard = St.Clipboard.get_default();
  }

  disable() {
    if (this._button) {
      this._button.destroy();
      this._button = null;
      this._icon = null;
      this._clipboard = null;
    }
  }

  _toggleMic() {
    this._recording = !this._recording;

    try {
      if (this._recording) {
        this._icon.gicon = Gio.icon_new_for_string(`${this.path}/icons/mic-recording.png`);
        this._startRecording();
        Main.notify('Microphone', 'Recording started');
      } else {
        this._icon.gicon = Gio.icon_new_for_string(`${this.path}/icons/mic-off.png`);
        this._stopRecording();
        Main.notify('Microphone', 'Recording stopped');
      }
    } catch (e) {
      logError(e, 'MicButtonExtension: Failed to toggle microphone');
      Main.notifyError('Microphone Error', 'Failed to toggle microphone');
    }
  }

  _startRecording() {
    // Example: Start recording using arecord (non-blocking)
    try {
      GLib.spawn_command_line_async('arecord -f cd /tmp/recording.wav');
    } catch (e) {
      logError(e, 'MicButtonExtension: Failed to start recording');
      Main.notifyError('Microphone Error', 'Failed to start recording');
    }
  }

  _stopRecording() {
    // Example: Stop recording and copy text to clipboard
    try {
      // Stop arecord process
      GLib.spawn_command_line_async('pkill -f arecord');

      // Use modern clipboard API to set text
      const text = 'Sample transcription text'; // Replace with actual transcription
      const bytes = new GLib.Bytes(text);
      this._clipboard.set_content(St.ClipboardType.CLIPBOARD, 'text/plain;charset=utf-8', bytes);

      Main.notify('Microphone', 'Text copied to clipboard');
    } catch (e) {
      logError(e, 'MicButtonExtension: Failed to stop recording or copy text');
      Main.notifyError('Microphone Error', 'Failed to stop recording or copy text');
    }
  }
}