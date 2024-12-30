import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class RpmOstreeStateExtension extends Extension {
    enable() {
        try {
            // Create a button with text directly
            this._button = new St.Button({
                label: 'Loading...',
                style_class: 'panel-button',
                can_focus: true,
            });

            // Insert the button into the panel
            Main.panel._rightBox.insert_child_at_index(this._button, 0);

            // Clicking the button triggers a refresh
            this._button.connect('button-press-event', () => {
                this._updateState();
            });

            // Perform initial update, then start periodic updates
            this._updateState();
            this._timeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                90,
                () => {
                    this._updateState();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        } catch (error) {
            logError(error, 'Error enabling RpmOstreeStateExtension');
            this.disable();
        }
    }

    disable() {
        if (this._button?.get_parent()) {
            this._button.get_parent().remove_child(this._button);
        }
        this._button = null;

        // Remove the timeout source so it stops updating
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
    }

    _updateState() {
        // Command to run
        const command = [
            'bash',
            '-c',
            "rpm-ostree status | grep '^State:' | awk '{print $2}'",
        ];

        try {
            const proc = new Gio.Subprocess({
                argv: command,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });
            proc.init(null);

            // Communicate asynchronously
            proc.communicate_utf8_async(null, null, (obj, res) => {
                try {
                    const [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                    let text = '';

                    if (ok && proc.get_successful()) {
                        text = stdout.trim() || 'N/A';
                    } else {
                        text = stderr.trim() || 'Error';
                    }

                    // Update the button label if still valid
                    if (this._button) {
                        this._button.label = text;
                    }
                } catch (e) {
                    logError(e, 'Error processing Subprocess output');
                    this.disable();
                }
            });
        } catch (error) {
            logError(error, 'Error launching rpm-ostree command');
            this.disable();
        }
    }
}
