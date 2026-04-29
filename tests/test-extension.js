import GLib from 'gi://GLib';

import { ExtensionState } from 'resource:///org/gnome/shell/misc/extensionUtils.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

const UUID = 'ostree-status@noobping.dev';

export var METRICS = {};

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

async function waitForExtensionState() {
    let lastState = 'not loaded';

    for (let attempt = 0; attempt < 50; attempt++) {
        const extension = Main.extensionManager.lookup(UUID);

        if (extension) {
            lastState = `${extension.state}`;

            if (extension.state === ExtensionState.ERROR && extension.error)
                throw new Error(`Extension ${UUID} failed: ${extension.error}`);

            if (extension.state === ExtensionState.ACTIVE && extension.stateObj)
                return extension.stateObj;
        }

        await Scripting.sleep(100);
    }

    throw new Error(`Timed out waiting for ${UUID}; last state was ${lastState}`);
}

async function waitForButtonChild(extensionState, expectedChild, description) {
    for (let attempt = 0; attempt < 50; attempt++) {
        if (extensionState._button?.get_child() === expectedChild)
            return;

        await Scripting.sleep(100);
    }

    throw new Error(`Timed out waiting for ${description}`);
}

export async function run() {
    console.debug('Running OSTree Status extension smoke test');

    await Scripting.waitLeisure();

    const extensionState = await waitForExtensionState();
    assert(extensionState._button?.get_parent(),
        'Extension panel button was not added to the panel');

    await waitForButtonChild(
        extensionState,
        extensionState._idleIcon,
        'idle status icon');

    const stateFile = GLib.getenv('RPM_OSTREE_TEST_STATE_FILE');
    assert(stateFile, 'RPM_OSTREE_TEST_STATE_FILE is not set');

    GLib.file_set_contents(stateFile, 'busy\n');
    extensionState._updateState();

    await waitForButtonChild(
        extensionState,
        extensionState._busyIcon,
        'busy status icon');

    console.debug('Finished OSTree Status extension smoke test');
}

export function finish() {
}
