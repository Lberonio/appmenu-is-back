// App Menu Is Back - Minimal
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import Shell from 'gi://Shell';
import { AppMenu } from 'resource:///org/gnome/shell/ui/appMenu.js';

const AppMenuButton = GObject.registerClass({}, class AppMenuButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, null, true);

        this._container = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        let bin = new St.Bin({ name: 'appMenu' });
        bin.set_child(this._container);
        this.add_child(bin);

        // Only label, no icon
        this._label = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._container.add_child(this._label);

        this._targetApp = null;

        // Create the menu
        this._menu = new AppMenu(this);
        this.setMenu(this._menu);
        Main.panel.menuManager.addMenu(this._menu);

        // Connect signals
        Shell.WindowTracker.get_default().connectObject('notify::focus-app', this._update.bind(this), this);
        Shell.AppSystem.get_default().connectObject('app-state-changed', this._update.bind(this), this);
        global.window_manager.connectObject('switch-workspace', this._update.bind(this), this);

        this._update();
    }

    _findTargetApp() {
        let workspace = global.workspace_manager.get_active_workspace();
        let tracker = Shell.WindowTracker.get_default();
        let focusedApp = tracker.focus_app;

        if (focusedApp && focusedApp.is_on_workspace(workspace))
            return focusedApp;

        return null;
    }

    _update() {
        let targetApp = this._findTargetApp();
        if (targetApp !== this._targetApp) {
            this._targetApp = targetApp;
        }

        if (!this._targetApp) {
            this._label.set_text('Desktop');
            this._menu.setApp(null);
        } else {
            this._label.set_text(this._targetApp.get_name());
            this._menu.setApp(this._targetApp);
        }

        this.show();
    }

    destroy() {
        this._menu?.destroy();
        Shell.WindowTracker.get_default().disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.window_manager.disconnectObject(this);
        super.destroy();
    }
});

export default class AppMenuIsBackExtension {
    enable() {
        this._appMenuButton = new AppMenuButton();
        if (!Main.panel.statusArea['appmenu-indicator'])
            Main.panel.addToStatusArea('appmenu-indicator', this._appMenuButton, -1, 'left');
    }

    disable() {
        this._appMenuButton?.destroy();
        this._appMenuButton = null;
    }
}
