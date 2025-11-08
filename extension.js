//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025

import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import { AppMenu } from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const PANEL_ICON_SIZE = 16;

const AppMenuButton = GObject.registerClass({
    Signals: { 'changed': {} },
}, class AppMenuButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, null, true);
        this.accessible_role = Atk.Role.MENU;
        this._menuManager = Main.panel.menuManager;
        this._startingApps = [];
        this._targetApp = null;

        this._container = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
        });
        this.add_child(this._container);

        // Monochrome symbolic icon with proper spacing
        const iconEffect = new Clutter.DesaturateEffect();
        this._iconBox = new St.Bin({
            y_align: Clutter.ActorAlign.CENTER,
            style: 'margin-right: 8px; -st-icon-style: symbolic;',
        });
        this._iconBox.add_effect(iconEffect);
        this._container.add_child(this._iconBox);

        this._label = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._container.add_child(this._label);

        const menu = new AppMenu(this);
        this.setMenu(menu);
        this._menuManager.addMenu(menu);

        Shell.WindowTracker.get_default().connectObject(
            'notify::focus-app', this._sync.bind(this), this
        );
        Shell.AppSystem.get_default().connectObject(
            'app-state-changed', this._sync.bind(this), this
        );
        global.window_manager.connectObject(
            'switch-workspace', this._sync.bind(this), this
        );
        Main.overview.connectObject(
            'hiding', this._sync.bind(this),
            'showing', this._sync.bind(this),
            this
        );

        // Ensure it shows "Desktop" immediately at login
        this._showDesktop();
    }

    _syncIcon(app) {
        const icon = app.create_icon_texture(PANEL_ICON_SIZE);
        icon.set_style_class_name('app-menu-icon');
        this._iconBox.set_child(icon);
    }

    _findTargetApp() {
        const workspace = global.workspace_manager.get_active_workspace();
        const tracker = Shell.WindowTracker.get_default();
        const focusedApp = tracker.focus_app;

        if (focusedApp && focusedApp.is_on_workspace(workspace))
            return focusedApp;

        for (const app of this._startingApps) {
            if (app.is_on_workspace(workspace))
                return app;
        }

        return null;
    }

    _showDesktop() {
        const icon = new St.Icon({
            icon_name: 'user-desktop-symbolic',
            icon_size: PANEL_ICON_SIZE,
            style_class: 'app-menu-icon',
        });
        this._iconBox.set_child(icon);
        this._label.set_text('Desktop');
        this._container.show();
        this.visible = true;
        this.reactive = true;
        this.menu.setApp(null);
    }

    _sync() {
        const targetApp = this._findTargetApp();

        if (this._targetApp !== targetApp) {
            this._targetApp = targetApp;

            if (this._targetApp) {
                this._label.set_text(this._targetApp.get_name());
                this.set_accessible_name(this._targetApp.get_name());
                this._syncIcon(this._targetApp);
            } else {
                this._showDesktop();
            }

            this._container.show();
        }

        const isVisible = !Main.overview.visible;
        this.visible = isVisible;
        this.reactive = isVisible;
        this.menu.setApp(this._targetApp);
        this.emit('changed');
    }

    destroy() {
        Shell.WindowTracker.get_default().disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.window_manager.disconnectObject(this);
        Main.overview.disconnectObject(this);
        super.destroy();
    }
});

export default class AppMenuIsBackExtension {
    enable() {
        this._button = new AppMenuButton();
        if (!Main.panel.statusArea['appmenu-indicator'])
            Main.panel.addToStatusArea('appmenu-indicator', this._button, -1, 'left');
    }

    disable() {
        this._button?.destroy();
        this._button = null;
    }
}
