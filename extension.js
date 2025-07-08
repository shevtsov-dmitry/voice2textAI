import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Soup from 'gi://Soup';
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
        Main.notify('Microphone', 'Recording will start in 3..2..1...');
      } else {
        this._icon.gicon = Gio.icon_new_for_string(`${this.path}/icons/mic-off.png`);
        this._stopRecording();
        // Main.notify('Microphone', 'Recording stopped');
      }
    } catch (e) {
      logError(e, 'MicButtonExtension: Failed to toggle microphone');
      Main.notifyError('Microphone Error', e.message, 'Failed to toggle microphone');
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
    try {
      // Stop recording using a more precise command
      GLib.spawn_command_line_async('pkill -f -x arecord');

      // Create HTTP session
      let httpSession = new Soup.Session();
      let message = Soup.Message.new('GET', 'http://localhost:8000/transcribe');

      // Send async request
      httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
        try {
          let response = session.send_and_read_finish(result);
          let text = (new TextDecoder('utf-8')).decode(response.get_data())
          text = correctRecievedText(text)

          // Set clipboard content
          let clipboard = St.Clipboard.get_default();
          clipboard.set_text(St.ClipboardType.CLIPBOARD, text);

          Main.notify('Microphone', 'Text copied to clipboard' + (text.length > 40 ? (": " + text.substring(0, 41) + "...") : ""));
        } catch (e) {
          logError(e, 'MicButtonExtension: Failed to process response');
          Main.notifyError('Microphone Error', e.message, 'Failed to process response');
        }
      });
    } catch (e) {
      logError(e, 'MicButtonExtension: Failed to stop recording or send request');
      Main.notifyError('Microphone Error', 'Failed to stop recording or send request');
    }

    function correctRecievedText(text) {
      if (text.length > 2) {
        text = text.substring(2, text.length - 2);
      }
      return text

    }
  }


}
