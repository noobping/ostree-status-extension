import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const BUSY_ICON = 'software-update-available-symbolic.svg';
const IDLE_ICON = 'verified-checkmark-symbolic.svg';

export default class RpmOstreeStateExtension extends Extension {
    enable() {
        try {
            // Create icons for different states
            this._busyIcon = this._makeStatusIcon(BUSY_ICON);
            this._idleIcon = this._makeStatusIcon(IDLE_ICON);

            this._button = new St.Button({
                style_class: 'panel-button',
                can_focus: true,
            });
            this._button.set_child(this._busyIcon);

            // Insert the button into the panel
            Main.panel._rightBox.insert_child_at_index(this._button, 0);

            // Clicking the button triggers an immediate refresh
            this._buttonPressId = this._button.connect('button-press-event', () => {
                this._updateState();
            });

            // Perform initial update, then start periodic updates
            this._updateState();
            this._timeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                10, // update interval in seconds
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

    _makeStatusIcon(iconFileName) {
        const file = Gio.File.new_for_path(
            GLib.build_filenamev([this.path, iconFileName])
        );

        return new St.Icon({
            gicon: new Gio.FileIcon({ file }),
            style_class: 'system-status-icon',
        });
    }

    disable() {
        // Remove the timeout source so it stops updating
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this._buttonPressId && this._button) {
            this._button.disconnect(this._buttonPressId);
            this._buttonPressId = null;
        }

        // Remove and destroy the button from the panel
        if (this._button) {
            if (this._button.get_parent()) {
                this._button.get_parent().remove_child(this._button);
            }
            this._button.set_child(null);
            this._button.destroy();
            this._button = null;
        }

        // Destroy the icons
        this._busyIcon?.destroy();
        this._busyIcon = null;
        this._idleIcon?.destroy();
        this._idleIcon = null;
    }

    _updateState() {
        // Command to run
        const command = [
            'sh',
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

                    // Trim output to see which state we have
                    let stateText = '';
                    if (ok && proc.get_successful()) {
                        stateText = stdout.trim() || 'N/A';
                    } else {
                        logError(e, 'Error processing Subprocess' + stderr.trim());
                        this.disable();
                    }

                    // Decide which icon to display based on state
                    if (!this._button) {
                        return; // In case it's disabled in the meantime
                    }

                    if (stateText === 'idle') {
                        this._button.set_child(this._idleIcon);
                    } else {
                        this._button.set_child(this._busyIcon);
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
