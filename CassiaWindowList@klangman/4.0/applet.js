/*
 * applet.js
 * Copyright (C) 2022 Kevin Langman <klangman@gmail.com>
 * Copyright (C) 2013 Lars Mueller <cobinja@yahoo.de>
 *
 * CassiaWindowList is a fork of CobiWindowList which is found here:
 *            https://cinnamon-spices.linuxmint.com/applets/view/287
 *
 * CassiaWindowList is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CassiaWindowList is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const Applet = imports.ui.applet;
const AppletManager = imports.ui.appletManager;
const St = imports.gi.St;
const Cinnamon = imports.gi.Cinnamon;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Tweener = imports.ui.tweener;
const Signals = imports.signals;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const Tooltips = imports.ui.tooltips;
const PopupMenu = imports.ui.popupMenu;
const BoxPointer = imports.ui.boxpointer;
const Clutter = imports.gi.Clutter;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const Gettext = imports.gettext;
const WindowUtils = imports.misc.windowUtils;
const DND = imports.ui.dnd;
const Settings = imports.ui.settings;
const SignalManager = imports.misc.signalManager;
const CinnamonDesktop = imports.gi.CinnamonDesktop;
const ModalDialog = imports.ui.modalDialog;

const UUID = "CassiaWindowList@klangman";

const ANIMATION_TIME = 0.5;
const DEFAULT_ICON_SIZE = 22;
const MINIMUM_ICON_SIZE = 16;
const ICON_HEIGHT_FACTOR = 0.8;

const FLASH_INTERVAL = 500;

const PANEL_EDIT_MODE_KEY = "panel-edit-mode";
const PANEL_ZONE_TEXT_SIZES = "panel-zone-text-sizes";


const STYLE_CLASS_ATTENTION_STATE = "grouped-window-list-item-demands-attention";

// Standard icons list borrowed from the cinnamon grouped-window-list
const ICON_NAMES = {
   area_shot: 'screenshot-area',
   base: 'x-office-database',
   big_picture: 'view-fullscreen',
   burn_image: 'stock_xfburn',
   calc: 'x-office-spreadsheet',
   calendar: 'view-calendar-month',
   community: 'system-users',
   compose: 'text-editor',
   contacts: 'x-office-address-book',
   create_project: 'project-development-new-template',
   document: 'document-new',
   draw: 'x-office-drawing',
   friends: 'user-available',
   fullscreen: 'view-fullscreen',
   impress: 'x-office-presentation',
   library: 'accessories-dictionary',
   mail: "mail-message",
   math: 'x-office-math',
   memos: 'stock_notes',
   mute: 'audio-volume-muted',
   new_document: 'document-new',
   new_event: 'resource-calendar-insert',
   new_message: 'mail-message',
   new_private_window: 'security-high',  //'view-private',
   new_root_window: 'dialog-password', 
   news: 'news-subscribe',               //'news',
   new_session: 'tab-new-symbolic',
   new_window: 'window-new',
   next: 'media-skip-forward',
   open_calendar: 'view-calendar-month',
   open_computer: 'computer',
   open_home: 'user-home',
   open_trash: 'user-trash',
   play: 'media-playback-start',
   play_pause: 'media-playback-start',
   preferences: 'preferences-other',
   prefs: 'preferences-other',
   previous: 'media-skip-backward',
   profile_manager_window: 'avatar-default-symbolic',
   screen_shot: 'view-fullscreen',     //'screenshot-fullscreen',
   screenshots: 'applets-screenshooter',
   servers: 'network-server',
   settings: 'preferences-other',
   ssa: 'screenshot-area',
   ssf: 'view-fullscreen',           //'screenshot-fullscreen',
   ssw: 'window',                    //'screenshot-window',
   stop_quit: 'media-playback-stop',
   store: 'applications-games',      //'store',
   tasks: 'view-pim-tasks',
   window: 'window-new',
   window_shot: 'window',           //'screenshot-window',
   writer: 'x-office-document'
}


// The possible user setting for the caption contents
const CaptionType = {
  Name: 0,           // Caption is set to the Application Name (i.e. Firefox)
  Title: 1,          // Caption is set to the window title as seen in the windows title bar
  None: 2            // No caption should be displayed
}

// The possible user setting for how application windows should be grouped
const GroupType = {
   Grouped: 0,       // All windows for an application should be grouped under a single windowlist button
   Pooled: 1,        // All windows for an application should be pooled side-by-side on the windowlist
   Auto: 2,          // Application windows should automatically switch between Grouped and Pooled based on whether button caption space is constrained 
   Off: 3,           // All windows should have there own windowlist button and no ordering is maintained.
   Launcher: 4       // Behave like a panel launcher applet, only pinned buttons will be displayed
}

// The possible user setting for how windows list buttons should be captioned
const DisplayCaption = {
  No: 0,            // No window list buttons will have text captions
  All: 1,           // All window list buttons will have captions
  Focused: 2,       // Only the window that has the focus will have a caption
  One: 3            // Only one window (the last one in the window list) will have a caption (only really makes sense when also using GroupType.Pooled/Auto)
}

// The possible user Settings for how window list window counts should be displayed
const DisplayNumber = {
  No: 0,            // The number of windows attached to a window list button is never displayed
  All: 1,           // ... always displayed
  Smart: 2          // ... only displayed when 2 of more windows exist
}

// Possible values for the WindowListButton._grouped variable which determines how each individual windowlist button is currently grouped
const GroupingType = {
  ForcedOff:   0,   // Button is ungrouped and CAN NOT be grouped automatically
  NotGrouped:  1,   // Button is not grouped but can be grouped automatically
                    // The value NotGrouped and lower indicate grouping is not currently active
  ForcedOn:    2,   // Button is grouped and can't be ungrouped automatically
  Auto:        3,   // Button was grouped automatically and can be ungrouped automatically 
  Tray:        4,   // Button is a "tray" and therefore only represents a group of windows not a specific window or application
  Unspecified: 5    // Only used to signal that the user setting should be queried, not a valid WindowListButton._grouped value
}

// Possible value for the Mouse Action setting
const MouseAction = {
  Preview: 0,      // Toggle the preview menu (open/close)
  PreviewHold: 1,  // Show the window preview menu on button press and hide it again on button release
  Close: 2,        // Close the window
  Minimize: 3,     // Minimize/restore toggle for the window
  Maximize: 4,     // Maximize/restore toggle for the window
  Group: 5,        // Group/Ungroup toggle (all the windows for this application under one window-list button)
  New: 6,          // Open a new window for this application
  MoveWorkspace1: 7,  // Move window to WorkSpace #1
  MoveWorkspace2: 8,  // 2
  MoveWorkspace3: 9,  // 3
  MoveWorkspace4: 10, // 4
  WS_Visibility: 11,  // Toggle workspace visibility from all to only this workspace
  None: 12,           // No action performed
  LastFocused: 13,    // Restore the window that was most recently the focused window for the application
  MoveMonitor1: 14,   // Move window to monitor #1
  MoveMonitor2: 15,   // 2
  MoveMonitor3: 16,   // 3
  MoveMonitor4: 17,   // 4
  MoveCurrMonitor: 18,// Move window to the current monitor (or to next monitor if window is already on current monitor)
  ShoveTitlebar: 19,  // Move the titlebar so that it is visible on the screen
  MovePrevWorkspace: 20, // Move window to the workspace -1 from it's current workspace
  MoveNextWorkspace: 21, // Move window to the workspace +1 from it's current workspace
  MovePrevMonitor: 22,   // Move window to the monitor -1 from it's current monitor
  MoveNextMonitor: 23    // Move window to the monitor +1 from it's current monitor
}

// Possible settings for the left mouse action for grouped buttons
const LeftClickGrouped = {
   Toggle: 0,         // Restore most resent window or minimize if already in focus
   Cycle: 1,          // Restore most recent window or cycle windows if any window is already in focus
   Thumbnail: 2,      // Show the Thumbnail menu of windows
   ToggleAndHold: 3   // Restore or Minimize on click, "hold" style thumbnail meanu on hold
}

// Possible values for the Pinned label setting
const PinnedLabel = {
   Never:   0,     // Pinned window buttons Never have labels
   Always:  1,     // Pinned window buttons will Always have labels
   Running: 2,     // Pinned windows that are also running will have labels
   Focused: 3      // Pinned windows that currently have the focus
}

const IndicatorType = {
   None: 0,
   Minimized: 1,
   Pinned: 2,
   Both: 3,
   Auto: 7
}

const ScrollWheelAction = {
   Off: 0,
   On: 1,
   OnGlobal: 2,
   OnApplication: 3
}

const KeyAndButton = {
   CtrlLeft: 0,
   CtrlMiddle: 1,
   CtrlRight: 2,
   CtrlBack: 3,
   CtrlForward: 4,
   ShiftLeft: 5,
   ShiftMiddle: 6,
   ShiftRight: 7,
   ShiftBack: 8,
   ShiftForward: 9
}

const Context = {
   WindowListButton: 0,
   ThumbnailWindow: 1
}

const Modifier = {
   Shift: 0,
   Ctrl: 1
}

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(text) {
  let locText = Gettext.dgettext(UUID, text);
  if (locText == text) {
    locText = window._(text);
  }
  return locText;
}

function hasFocus(metaWindow, allowTransient=true) {
    let window = global.display.get_focus_window();
    if (window === metaWindow) {
       return true;
    }
    //if (metaWindow.appears_focused) {
    //    log( "appears_focused" );
    //    return true;
    //}
    if (allowTransient===false) {
       return false;
    }
    let transientHasFocus = false;
    metaWindow.foreach_transient(function(transient) {
        if (transient.appears_focused) {
            transientHasFocus = true;
            return false;
        }
        return true;
    });
    return transientHasFocus;
}

function resizeActor(actor, time, toWidth, text, button) {
  Tweener.addTween(actor, {
    natural_width: toWidth,
    time: time * 0.001,
    transition: "easeInOutQuad",
    onComplete() {
       if (this._shrukenLabel) {
          // Since some fonts don't seem to report the right size when calling get_pixel_size() before animation is complete
          // so we need to see what the actual size is now and set _minLabelSize accordingly.
          let minText = (this._pinned && (this._applet.indicators&IndicatorType.Pinned)) ? "\u{1F4CC}\u{2193}" : "\u{2193}";
          if (text == minText) {
             let layout = this._label.get_clutter_text().get_layout();
             let [curWidth, curHeight] = layout.get_pixel_size();
             this._minLabelSize = curWidth;
          }
       }
    },
    onCompleteScope: button
  });
}

function animatedRemoveAppButton(workspace, time, button) {
  if (button.closing===true) {
     return;
  }
  let app = button._app;
  button.closing = true;
  button._app = null;
  if (button._shrukenLabel===false){
    // If we need a different button to have the label then start the animation now
    // so that it is synchronized with this remove button animation
    let captionType = button._settings.getValue("display-caption-for");
    if (captionType == DisplayCaption.One) {
      let allButtons = workspace._lookupAllAppButtonsForApp(app);
      if (allButtons.length >= 1) {
         allButtons[allButtons.length-1]._updateLabel();
      }
    }
  }
  Tweener.addTween(button._labelBox, {
    natural_width: 0,
    time: time * 0.001,
    transition: "easeInOutQuad",
    onComplete() {
       this._removeAppButton(button);
    },
    onCompleteScope: workspace
  });
}

function getOverheadSize(actor) {
  if (actor == null) {
    return null;
  }
  let height = 0;
  let width = 0;
  let themeNode = actor.get_theme_node();

  width = themeNode.get_padding(St.Side.LEFT);
  width += themeNode.get_padding(St.Side.RIGHT);
  width += themeNode.get_border_width(St.Side.LEFT);
  width += themeNode.get_border_width(St.Side.RIGHT);

  height = themeNode.get_padding(St.Side.TOP);
  height += themeNode.get_padding(St.Side.BOTTOM);
  height += themeNode.get_border_width(St.Side.TOP);
  height += themeNode.get_border_width(St.Side.BOTTOM);

  width += themeNode.get_margin(St.Side.LEFT);
  width += themeNode.get_margin(St.Side.RIGHT);
  height += themeNode.get_margin(St.Side.TOP);
  height += themeNode.get_margin(St.Side.BOTTOM);

  return [width, height];
}

function getMonitors() {
  let result = [];

  try {
    let gdkScreen = Gdk.Screen.get_default();
    let screen = CinnamonDesktop.RRScreen.new(gdkScreen);
    let currentConfig = CinnamonDesktop.RRConfig.new_current(screen);
    let outputInfos = currentConfig.get_outputs();

    for (let index = 0; index < outputInfos.length; index++) {
      let output = outputInfos[index];
      if (output.is_active()) {
        result.push(output.get_display_name());
      }
    }
  } catch (err) {
    return [];
  }

  return result;
}

// Return a MouseAction if a mount action is defined for the ctrlHeld state, context and mouse button
//       mouseBtn = 1-3 (left, middle, right) or 8-9 (back, forward)
function getKeyAndButtonMouseAction(mouseActionList, modifier, context, mouseBtn) {
   let keyAndButton = ((modifier)?0:5) + ((mouseBtn<4)?mouseBtn-1:mouseBtn-5);
   //log( `Looking for adv mouse action for ctrlHeld=${modifier}, thumbContext=${context}, btn=${mouseBtn}, k&b=${keyAndButton}` );
   for (let i=0 ; i < mouseActionList.length ; i++) {
      //log( `enabled=${mouseActionList[i].enabled}, context=${mouseActionList[i].context}, k&b=${mouseActionList[i].keyAndButton}, action=${mouseActionList[i].action}` );
      if (mouseActionList[i].enabled && mouseActionList[i].context == context && mouseActionList[i].keyAndButton == keyAndButton) {
         return mouseActionList[i].action;
      }
   }
   return -1;
}

// Represents an item in the Thumbnail popup menu
class ThumbnailMenuItem extends PopupMenu.PopupBaseMenuItem {

  constructor(menu, appButton, metaWindow) {
    super();
    this._menu = menu;
    this._appButton = appButton;
    this._metaWindow = metaWindow;
    this._signalManager = new SignalManager.SignalManager(null);
    this._settings = this._menu._settings;

    this._box = new St.BoxLayout({vertical: true, reactive: true, style: 'border-width:2px;padding:' + 3 * global.ui_scale + 'px;', style_class: 'item-box'});
    this.actor.set_style("padding: 0.5em;");
    this.addActor(this._box);

    this._iconSize = 20 * global.ui_scale;
    this.descSize = 24 * global.ui_scale;
    this._icon = this._appButton._app ?
                  this._appButton._app.create_icon_texture_for_window(this._iconSize, this._metaWindow) :
                  new St.Icon({ icon_name: "application-default-icon",
                                icon_type: St.IconType.FULLCOLOR,
                                icon_size: this._iconSize });
    this._icon.natural_width = this._iconSize;
    this._icon.natural_height = this._iconSize;
    this._icon.set_width(-1);
    this._icon.set_height(-1);
    let monitor = this._appButton._applet.panel.monitor;
    let width = monitor.width;
    let height = monitor.height;
    let aspectRatio = width / height;
    height = Math.round(height / 10) * global.ui_scale;
    width = Math.round(height * aspectRatio);

    this._descBox = new St.BoxLayout({natural_width: width});
    this._box.add_actor(this._descBox);

    this._iconBin = new St.Bin({min_width: 0, min_height: 0, natural_width: this.descSize, natural_height: this.descSize});
    this._descBox.add_actor(this._iconBin);
    this._iconBin.set_child(this._icon);

    this._label = new St.Label();
    let text = this._metaWindow.get_title();
    if (!text) {
      text = this._appButton._app.get_name();
    }
    if (!text) {
      text = "?";
    }
    this._label.set_text(text);
    this._labelBin = new St.Bin();
    this._labelBin.set_alignment(St.Align.START, St.Align.MIDDLE);
    this._descBox.add_actor(this._labelBin);
    this._labelBin.add_actor(this._label);

    this._spacer = new St.Widget();
    this._descBox.add(this._spacer, {expand: true});

    this._closeBin = new St.Bin({min_width: 0, min_height: 0, natural_width: this.descSize, natural_height: this.descSize, reactive: true});
    this._closeIcon = new St.Bin({style_class: "window-close", natural_width: this._iconSize, height: this._iconSize});
    this._descBox.add_actor(this._closeBin);
    this._closeBin.set_child(this._closeIcon);
    this._closeIcon.hide();

    if (this._appButton._windows.length > 1 && this._appButton._currentWindow === metaWindow) {
      this._box.add_style_pseudo_class('outlined');
    } else if (this._appButton.appLastFocus &&
              ((this._settings.getValue("group-windows")===GroupType.Pooled && this._settings.getValue("menu-all-windows-of-pool")) || 
               (this._settings.getValue("group-windows")===GroupType.Auto && this._settings.getValue("menu-all-windows-of-auto")))) {
      let btns = appButton._workspace._lookupAllAppButtonsForApp(appButton._app);
      if (btns.length > 1)
         this._box.add_style_pseudo_class('outlined');
    }

    if (!Main.software_rendering && this._settings.getValue("show-previews")) {
      this._cloneBin = new St.Bin({min_width: 0, min_height: 0});
      this._box.add_actor(this._cloneBin);
      this._cloneBox = new St.Widget();
      this._cloneBin.add_actor(this._cloneBox);
    }
    this._signalManager.connect(this.actor, "enter-event", this._onEnterEvent, this);
    this._signalManager.connect(this.actor, "leave-event", this._onLeaveEvent, this);
    this._signalManager.connect(this, "activate", this._onActivate, this);
  }

  handleDragOver(source, actor, x, y, time) {
    this.actor.hover = true;
    Main.activateWindow(this._metaWindow);
    return DND.DragMotionResult.COPY_DROP;
  }

  doSize(availWidth, availHeight) {
    if (Main.software_rendering || !this._settings.getValue("show-previews")) {
      return;
    }
    let monitor = this._appButton._applet.panel.monitor;
    let width = monitor.width;
    let height = monitor.height;
    let aspectRatio = width / height;

    let [overheadWidth, overheadHeight] = getOverheadSize(this.actor);
    overheadHeight += this.descSize;

    this._cloneBox.remove_all_children();

    if (this._menu.box.get_vertical()) {
      height = (availHeight - overheadHeight);
      width = Math.floor(height * aspectRatio);
      this._cloneBin.height = height;
      this._cloneBin.width = width;
    } else {
      width = (availWidth - overheadWidth);
      height = Math.floor(width / aspectRatio);
      this._cloneBin.height = height;
      this._cloneBin.width = width;
    }

    this._descBox.natural_width = width;

    let clones = WindowUtils.createWindowClone(this._metaWindow, width, height, true, true);
    for (let i = 0; i < clones.length; i++) {
      let clone = clones[i];
      this._cloneBox.add_actor(clone.actor);
      clone.actor.set_position(clone.x, clone.y);
    }
  }

  _onEnterEvent() {
    if (this._closeIcon instanceof St.Bin) {
      // fetch the css icon here, so we don't mess with "not in the stage" in the constructor"
      let icon = St.TextureCache.get_default().load_file_simple(this._closeIcon.get_theme_node().get_background_image());
      icon.natural_width = this._iconSize;
      icon.natural_height = this._iconSize;
      icon.set_opacity(128);
      this._closeBin.set_child(null);
      this._closeIcon = icon;
      this._closeIcon.set_reactive(true);
      this._closeBin.set_child(this._closeIcon);
      this._signalManager.connect(this._closeIcon, "button-release-event", this._onClose, this);
      this._signalManager.connect(this._closeBin, "enter-event", this._onCloseIconEnterEvent, this);
      this._signalManager.connect(this._closeBin, "leave-event", this._onCloseIconLeaveEvent, this);
    }
    this._closeIcon.show();
  }

  _onLeaveEvent() {
    this._closeIcon.hide();
  }

  _onCloseIconEnterEvent() {
    this._closeIcon.set_opacity(255);
  }

  _onCloseIconLeaveEvent() {
    this._closeIcon.set_opacity(128);
  }

  _onButtonReleaseEvent (actor, event) {
    let mouseBtn = event.get_button();
    if (this._appButton._workspace.holdPopup == mouseBtn) {
       this._appButton._workspace.holdPopup = undefined;
       this._appButton.closeThumbnailMenu()
       Main.activateWindow(this._metaWindow);
       return true;
    }
    // If the Ctrl or Shift key is held, and there is a defined action for that key+button combination then do the specified action
    if (event.has_control_modifier() || event.has_shift_modifier()) {
       let mouseActionList = this._settings.getValue("adv-mouse-list");
       let action = getKeyAndButtonMouseAction( mouseActionList, event.has_control_modifier()?Modifier.Ctrl:Modifier.Shift, Context.ThumbnailWindow, mouseBtn );
       if (action!=-1) {
          this._appButton._performMouseAction(action, this._metaWindow);
          return true;
       }
    }
    if (mouseBtn == 2) {  // Middle button
      let action = this._settings.getValue("preview-middle-click");
      this._appButton._performMouseAction(action, this._metaWindow);
      return true;
    } else if (mouseBtn == 3) { // Right button
      this._appButton._populateContextMenu(this._metaWindow);
      this._appButton._contextMenu.open();
      this._appButton._updateFocus();
      return true;
    } else if(mouseBtn == 8) {
      let action = this._settings.getValue("preview-back-click");
      this._appButton._performMouseAction(action, this._metaWindow);
      return true;
    } else if(mouseBtn == 9) {
      let action = this._settings.getValue("preview-forward-click");
      this._appButton._performMouseAction(action, this._metaWindow);
      return true;
    }
    super._onButtonReleaseEvent(actor, event);
    return true;
  }

  _onClose() {
    this._inClosing = true;
    this._metaWindow.delete(global.get_current_time());
    this._inClosing = false;
    return true;
  }

  _onActivate() {
    if (!this._inClosing) {
      this._appButton.closeThumbnailMenu()
      Main.activateWindow(this._metaWindow);
    }
  }

  hide() {
    this._menu._inHiding = true;
    this._closeBin.hide();

    if (this._cloneBin) {
      let animTime = 0.5; //this._settings.getValue("label-animation-time") * 0.001;
      Tweener.addTween(this.actor, {
        width: 0,
        time: animTime,
        transition: "easeInOutQuad",
        onUpdate: Lang.bind(this, function() {
          this.actor.set_clip(this.actor.x, this.actor.y, this.actor.width, this.actor.height);
        }),
        onComplete: Lang.bind(this, function () {
          this.actor.hide();
          this.actor.set_width(-1);
          this._menu._inHiding = false;
          this.destroy();
        })
      });
    } else {
      this.actor.hide();
      this._menu._inHiding = false;
      this.destroy();
    }
  }

  updateUrgentState() {
    if (this._metaWindow.urgent || this._metaWindow.demands_attention) {
      this.actor.add_style_class_name(STYLE_CLASS_ATTENTION_STATE);
    } else {
      this.actor.remove_style_class_name(STYLE_CLASS_ATTENTION_STATE);
    }
  }

  destroy() {
    this._signalManager.disconnectAllSignals();
    super.destroy();
  }
}

// The Thumbnail popup menu
class ThumbnailMenu extends PopupMenu.PopupMenu {

  constructor(appButton) {
    super(appButton.actor, appButton._applet.orientation);
    this._appButton = appButton;
    this._settings = this._appButton._settings;
    this._signalManager = new SignalManager.SignalManager(null);
    this.numThumbs = undefined;
    this.setCustomStyleClass("grouped-window-list-thumbnail-menu");

    global.focus_manager.add_group(this.actor);
    this.actor.reactive = true;
    Main.layoutManager.addChrome(this.actor);
    this.actor.hide();

    this._updateOrientation();

    this._signalManager.connect(this.actor, "enter-event", this._onEnterEvent, this);
    this._signalManager.connect(this.actor, "leave-event", this._onLeaveEvent, this);
    this._signalManager.connect(this.actor, "scroll-event", this._onScrollEvent, this);
  }

  _updateOrientation() {
    if (!Main.software_rendering) {
      this.box.set_vertical(false);
    }

    if (this._appButton._applet.orientation == St.Side.LEFT ||
        this._appButton._applet.orientation == St.Side.RIGHT ||
        !this._settings.getValue("show-previews")) {
      this.box.set_vertical(true);
    }
  }

  _onEnterEvent() {
    this._appButton.removeThumbnailMenuDelay();
    return false;
  }

  _onLeaveEvent() {
    this._appButton.closeThumbnailMenuDelayed();
    return false;
  }

  _onScrollEvent(actor, event) {
     this._appButton._onScrollEvent(actor, event);
  }

  _findMenuItemForWindow(metaWindow) {
    let items = this._getMenuItems();
    items = items.filter(function(item) {
      return item._metaWindow == metaWindow;
    });
    if (items.length > 0) {
      return items[0];
    }
    return null;
  }

  openMenu() {
    if (this.isOpen || this._appButton._windows.length==0 || global.settings.get_boolean("panel-edit-mode") === true) {
      return;
    }
    this._updateOrientation();
    let groupingType = this._settings.getValue("group-windows");
    let allWindowsForPool = false;
    if (groupingType === GroupType.Pooled){
       allWindowsForPool = this._settings.getValue("menu-all-windows-of-pool");
    } else if (groupingType === GroupType.Auto){
       allWindowsForPool = this._settings.getValue("menu-all-windows-of-auto");
    }
    let btns = this._appButton._workspace._lookupAllAppButtonsForApp(this._appButton._app);
    let windows = [];
    if (this._appButton._windows.length>1 || btns.length == 1 || allWindowsForPool == false){
      windows = this._appButton._windows;
    } else {
       for( let i=0 ; i< btns.length ; i++ ) {
          windows.push(btns[i]._windows[0]);
       }
    }
    for (let i = 0; i < windows.length; i++) {
      let window = windows[i];
      this.addWindow(window);
    }
    let wheelSetting = this._settings.getValue("wheel-adjusts-preview-size");
    if (wheelSetting===ScrollWheelAction.OnGlobal)
       this.numThumbs = this._appButton._workspace.thumbnailSize;
    this.updateUrgentState();
    this.recalcItemSizes();

    super.open(false);
  }

  closeMenu() {
    this._appButton._workspace.holdPopup = undefined;
    if (this._inHiding && this.numMenuItems > 1) {
      return;
    }
    //log( "menu close called!" );
    //var err = new Error();
    //log( "Stack:\n"+err.stack );
    super.close(false);
    this.removeAll();
    if (this._settings.getValue("wheel-adjusts-preview-size")<ScrollWheelAction.OnGlobal) // Off or On
       this.numThumbs = this._settings.getValue("number-of-unshrunk-previews"); // reset the preview window size in case scroll-wheel zooming occurred.
  }

  addWindow(window) {
    if (this._findMenuItemForWindow(window) == null) {
      let appBtn = this._appButton
      if (appBtn._windows.length == 1 && appBtn._windows[0] != window) {
         appBtn = this._appButton._workspace._lookupAppButtonForWindow(window);
      }
      let menuItem = new ThumbnailMenuItem(this, appBtn, window);
      this.addMenuItem(menuItem);
      this.recalcItemSizes();
    }
  }

  removeWindow(metaWindow) {
    let item = this._findMenuItemForWindow(metaWindow);
    if (item && this.numMenuItems > 1) {
      item.hide();
    }
  }

  recalcItemSizes() {
    let [overheadWidthActor, overheadHeightActor] = getOverheadSize(this.actor);
    let [overheadWidth, overheadHeight] = getOverheadSize(this.box);
    overheadWidth += overheadWidthActor;
    overheadHeight += overheadHeightActor;

    let monitor = this._appButton._applet.panel.monitor;
    let panels = Main.panelManager.getPanelsInMonitor(this._appButton._applet.panel.monitorIndex);
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].panelPosition == Panel.PanelLoc.top || panels[i].panelPosition == Panel.PanelLoc.bottom) {
        overheadHeight += panels[i].actor.height;
      } else {
        overheadWidth += panels[i].actor.width;
      }
    }

    let availWidth = monitor.width - overheadWidth;
    let availHeight = monitor.height - overheadHeight;

    let spacing = Math.round(this.box.get_theme_node().get_length("spacing"));

    let items = this._getMenuItems();
    let numItems = items.length;

    let itemWidth = availWidth;
    let itemHeight = availHeight;

    let numThumbs;
    if (this.numThumbs === undefined) {
       numThumbs = this._settings.getValue("number-of-unshrunk-previews");
       this.numThumbs = numThumbs;
    } else {
       numThumbs = this.numThumbs;
    }

    if (this.box.get_vertical()) {
      itemHeight = (availHeight / (Math.max(numItems, numThumbs))) - ((numItems - 1) * spacing * global.ui_scale);
    } else {
      itemWidth = (availWidth / (Math.max(numItems, numThumbs))) - ((numItems - 1) * spacing * global.ui_scale);
    }

    for (let i = 0; i < numItems; i++) {
      items[i].doSize(itemWidth, itemHeight);
    }
  }

  destroy() {
    this._signalManager.disconnectAllSignals();
    super.destroy();
  }

  updateUrgentState() {
    let items = this._getMenuItems();
    items.forEach(menuItem => {
      menuItem.updateUrgentState();
    });
  }
}

class ThumbnailMenuManager extends PopupMenu.PopupMenuManager {

  constructor(owner) {
    super(owner);
    this.dragMotion = this.dragMotionHandler.bind(this);
    this._signals.connect(Main.xdndHandler, "drag-end", this.onDragEnd, this);
    this._signals.connect(Main.xdndHandler, "drag-begin", this.onDragBegin, this);
    this._workspace = owner;
  }

  onDragBegin() {
    DND.addDragMonitor(this);
  }

  onDragEnd() {
    DND.removeDragMonitor(this);
    this._workspace.closeThumbnailMenu();
  }

  dragMotionHandler(dragEvent) {
    if (dragEvent) {
      if (dragEvent.source instanceof WindowListButton || dragEvent.source.isDraggableApp || dragEvent.source instanceof DND.LauncherDraggable) {
        return DND.DragMotionResult.CONTINUE;
      }
      let hoverMenu = this._findMenuForActor(dragEvent);
      if (hoverMenu) {
        if (hoverMenu !== this._activeMenu) {
          if (hoverMenu._appButton._windows.length > 1) {
            this._changeMenu(hoverMenu);
          } else if (hoverMenu._appButton._windows.length === 1) {
            this._workspace.closeThumbnailMenu();
            Main.activateWindow(hoverMenu._appButton._currentWindow);
          }
        }
      } else {
        this._workspace.closeThumbnailMenu();
      }
    }
    return DND.DragMotionResult.CONTINUE;
  }

  _findMenuForActor(dragEvent) {
    let actor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, dragEvent.x, dragEvent.y);
    if (actor.is_finalized()) {
      return null;
    }
    for (let i = 0; i < this._menus.length; i++) {
      let menu = this._menus[i];
      if (menu.actor.contains(actor) || menu.sourceActor.contains(actor)) {
        return menu;
      }
    }
    return null;
  }
}

// A WindowListButton represents a single button on the window list
class WindowListButton {

  constructor(workspace, applet, app) {
    this._toggle = 0
    this._workspace = workspace;
    this._applet = applet;
    this._app = app;
    this._settings = this._applet._settings;
    this._needsAttention = [];
    this._signalManager = new SignalManager.SignalManager(null);

    this._pinned = false;

    //this.actor = new St.Group({style_class: "grouped-window-list-item-box", style: 'border:0px;padding:0px;margin:0px',
    //                               track_hover: false, can_focus: true, reactive: true});

    //this.progressOverlay = new St.Widget({ style_class: "progress", reactive: false, important: true  });
    //this.actor.add_actor(this.progressOverlay);
    //this.progressOverlay.hide();

    this.actor = new St.BoxLayout({style_class: "grouped-window-list-item-box", style: 'border:0px;padding:0px;margin:0px',
                                   track_hover: false, can_focus: true, reactive: true});
    this.actor._delegate = this;
    //this.actor.add_actor(this.mainBox);

    this._shrukenLabel = false;
    this._minLabelSize = -1;
    this._lableWidth = 0;
    this._label = new St.Label();
    this._labelBox = new St.Bin({natural_width: 0, min_width: 0, x_align: St.Align.START});
    this._labelBox.add_actor(this._label);

    this._tooltip = new Tooltips.PanelItemTooltip(this, this._app.get_name(), this._applet.orientation);

    this._iconBox = new St.Group({style: 'border:0px;padding:0px;margin:0px'});
    this.actor.add_actor(this._iconBox);
    this.actor.add_actor(this._labelBox);

    this._icon = null;
    this._iconBin = new St.Bin({name: "appMenuIcon"});
    this._iconBin._delegate = this;
    this._iconBox.add_actor(this._iconBin);

    this._labelNumberBox = new St.BoxLayout();
    this._labelNumberBin = new St.Bin({
      important: true, style_class: "grouped-window-list-badge", x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
    this._labelNumber = new St.Label({style_class: "grouped-window-list-number-label"});
    this._iconBox.add_actor(this._labelNumberBox);
    this._labelNumberBox.add_actor(this._labelNumberBin);
    this._labelNumberBin.add_actor(this._labelNumber);

    this._windows = [];
    this._nextWindow = null;                  // When cycling windows, keep track of the next window to cycle to
    this._grouped = GroupingType.NotGrouped;  // If button is a group of windows and why it was grouped
    this._currentWindow = null;

    this._updateOrientation();

    this._contextMenuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new ThumbnailMenu(this);
    this._contextMenu = new Applet.AppletPopupMenu(this, this._applet.orientation);
    this._contextMenuManager.addMenu(this._contextMenu);

    this._signalManager.connect(this.actor, "button-press-event", this._onButtonPress, this);
    this._signalManager.connect(this.actor, "button-release-event", this._onButtonRelease, this);
    this._signalManager.connect(this.actor, "scroll-event", this._onScrollEvent, this);
    this._signalManager.connect(this._settings, "changed::caption-type", this._updateLabel, this);
    this._signalManager.connect(this._settings, "changed::display-caption-for-pined", this._updateLabel, this);
    this._signalManager.connect(this._settings, "changed::hide-caption-for-minimized", this._updateLabel, this);
    this._signalManager.connect(this._settings, "changed::display-caption-for", this._updateLabel, this);
    this._signalManager.connect(this._settings, "changed::display-number", this._updateNumber, this);
    this._signalManager.connect(this._settings, "changed::menu-show-on-hover", this._updateTooltip, this);
    this._signalManager.connect(this._settings, "changed::grouped-mouse-action-btn1", this._updateTooltip, this);
    this._signalManager.connect(this._settings, "changed::show-tooltips", this._updateTooltip, this);
    this._signalManager.connect(this._settings, "changed::number-style", Lang.bind(this, function() { this._updateNumber(); this._updateLabel(); }), this);
    this._signalManager.connect(this._settings, "changed::label-width", this._updateLabel, this);
    this._signalManager.connect(this.actor, "enter-event", this._onEnterEvent, this);
    this._signalManager.connect(this.actor, "leave-event", this._onLeaveEvent, this);
    this._signalManager.connect(this.actor, "notify::hover", this._updateVisualState, this);
    this._signalManager.connect(this._contextMenu, "open-state-changed", this._contextState, this);

    this._signalManager.connect(Main.themeManager, "theme-set", Lang.bind(this, function() {
      this.updateView();
    }), this);
    this._signalManager.connect(St.TextureCache.get_default(), "icon-theme-changed", this.updateIcon, this);

    this._draggable = DND.makeDraggable(this.actor);
    this._draggable.inhibit = global.settings.get_boolean(PANEL_EDIT_MODE_KEY);
    global.settings.connect("changed::" + PANEL_EDIT_MODE_KEY, Lang.bind(this, this._updateDragInhibit));
    this._applet.panel.connect("icon-size-changed", Lang.bind(this, this._updateTextSizes));
    this._draggable.connect("drag-begin", Lang.bind(this, this._onDragBegin));
    this._draggable.connect("drag-end", Lang.bind(this, this._onDragEnd));

    this.isDraggableApp = true;
    this._updateNumber();
  }

  get_app_id() {
    return this._app.get_id();
  }

  _contextState(menu, open) {
     // Get current window with focus
     let window = global.display.get_focus_window();
     let focus = null;
     if (window) {
        focus = this._workspace._lookupAppButtonForWindow(window);
     }

     if (open) {
        this.actor.set_hover(true);
     } else {
        this.actor.set_hover(false);
     }
  }

  _updateTextSizes(){
     this._minLabelSize = -1;    // Forget the min size of shrunken labels since the text size has been modified!
     if (this._shrukenLabel)
        this._updateLabel();     // Re-calculate the button size
  }
  _updateDragInhibit() {
    this._draggable.inhibit = global.settings.get_boolean(PANEL_EDIT_MODE_KEY);
  }

  _onDragBegin() {
    if (this.holdDelay) {
       let doIt = GLib.MainContext.default().find_source_by_id(this.holdDelay);
       if (doIt) {
          Mainloop.source_remove(this.holdDelay);
       }
    }
    this.actor.set_hover(false);
    this._tooltip.hide();
    this._tooltip.preventShow = true;
    this.closeThumbnailMenu();
  }

  _onDragEnd() {
    this._workspace._clearDragPlaceholder();
    this._updateVisibility();
    this._updateTooltip();
  }

  getDragActor() {
    let clone = new Clutter.Clone({ source: this._iconBin });
    clone.width = this._iconBin.width;
    clone.height = this._iconBin.height;
    return clone;
  }

  getDragActorSource() {
    return this.actor;
  }

  getPinnedIndex() {
    let pinSetting = this._settings.getValue("pinned-apps")[this._workspace._wsNum];
    return this._pinned ? pinSetting.indexOf(this._app.get_id()) : -1;
  }

  _onWmClassChanged(metaWindow) {
    let workspace = this._workspace;
    workspace._windowRemoved(metaWindow);
    workspace._windowAdded(metaWindow);
  }

  _onGtkApplicationChanged(metaWindow) {
    let workspace = this._workspace;
    workspace._windowRemoved(metaWindow);
    workspace._windowAdded(metaWindow);
  }

  addWindow(metaWindow) {
    if (this._pinned && this._windows.length===0) {
       this._minLabelSize = -1;
    }
    this._windows.push(metaWindow);
    if (this._windows.length == 1) {
       this._currentWindow = metaWindow;
    }
    if (this.menu && this.menu.isOpen) {
      this.menu.addWindow(metaWindow);
    }
    this._updateCurrentWindow();
    this._updateNumber();
    this._updateLabel();
    this._updateVisibility();

    this._signalManager.connect(metaWindow, "notify::title", this._updateLabel, this);
    this._signalManager.connect(metaWindow, "notify::minimized", this._onMinimized, this);
    this._signalManager.connect(metaWindow, "notify::urgent", this._updateUrgentState, this);
    this._signalManager.connect(metaWindow, "notify::demands-attention", this._updateUrgentState, this);
    this._signalManager.connect(metaWindow, "notify::gtk-application-id", this._onGtkApplicationChanged, this);
    this._signalManager.connect(metaWindow, "notify::wm-class", this._onWmClassChanged, this);
    //this._signalManager.connect(metaWindow, "notify::progress", this._onProgressChange, this);
    this._signalManager.connect(metaWindow, "workspace-changed", this._onWindowWorkspaceChanged, this);

    this.actor.add_style_pseudo_class("active");
    this._updateTooltip();
    if (this.menu && this._windows.length == 1) {
      this._workspace.menuManager.addMenu(this.menu);
    }
  }

  removeWindow(metaWindow) {
    this._signalManager.disconnect("notify::title", metaWindow);
    this._signalManager.disconnect("notify::minimized", metaWindow);
    this._signalManager.disconnect("notify::urgent", metaWindow);
    this._signalManager.disconnect("notify::demands-attention", metaWindow);
    this._signalManager.disconnect("notify::gtk-application-id", metaWindow);
    this._signalManager.disconnect("notify::wm-class", metaWindow);
    this._signalManager.disconnect("workspace-changed", metaWindow);

    let arIndex = this._windows.indexOf(metaWindow);
    if (arIndex >= 0) {
      this._windows.splice(arIndex, 1);
      this._updateCurrentWindow();
      if (this.menu && this.menu.isOpen) {
        this.menu.removeWindow(metaWindow);
      }
    }
    if (this._pinned) {
      if (!this._currentWindow) {
        this.actor.remove_style_pseudo_class("focus");
        this.actor.remove_style_pseudo_class("active");
        this._minLabelSize = -1
        this.closeThumbnailMenu();
      }
    }
    this._updateTooltip();
    this._updateNumber();
    this._updateLabel();
    this._updateVisibility();
  }

  /*
  _onProgressChange() {
     if (this._currentWindow && this._currentWindow.progress !== undefined && this.actor.is_visible()) {
        if (this._currentWindow.progress !== 0 ) {
           let width = Math.max((this.actor.width) * (this._currentWindow.progress / 100.0), 1.0);
           let height = Math.max((this._applet._panelHeight * 0.15), 1.0);
           let box = Clutter.ActorBox.new(0,0,width,height);
           log( `Updating progress to ${this._currentWindow.progress}%` );
           this.progressOverlay.allocate(box, 0);
           this.progressOverlay.show();
        } else if (this.progressOverlay.is_visible()){
           log( "Disabling progress bar" );
           this.progressOverlay.hide();
        }
     }
  }*/

  _updateCurrentWindow() {
    // Without slice, this will reorder to windows in the this._windows array
    let windows = this._windows.slice();
    if (windows.length > 1) {
      windows = windows.sort(function(a, b) {
        return b.user_time - a.user_time;
      });
      this.sortedWindows = windows;
    }
    this._currentWindow = windows.length > 0 ? windows[0] : null;
    if (this._currentWindow) {
      this._updateLabel();
    }
  }

  _onWindowWorkspaceChanged(window, wsNum) {
    this._applet.windowWorkspaceChanged(window, wsNum);
  }

  _updateTooltip() {
    if (this.closing)
       return;
    let enableTooltips = this._settings.getValue("show-tooltips");
    let hoverEnabled = this._settings.getValue("menu-show-on-hover");
    if (!enableTooltips || !this._tooltip || (hoverEnabled && this._windows.length > 0)) {
       if (this._tooltip)
          this._tooltip.set_text("");
          this._tooltip.preventShow = false
       return;
    }
    let text = null;
    if (this._windows.length == 0 || this._currentWindow.get_title()==null || (this._windows.length > 1 && this._settings.getValue("grouped-mouse-action-btn1")===LeftClickGrouped.Thumbnail)) {
       text = this._app.get_name();
    } else {
       text = this._currentWindow.get_title();
    }
    // If this button's window is associated with a hotkey sequence, then append the hotkey sequence to the tooltip
    let hotKeys = this._applet._keyBindings;
    let hotKeyWindows = this._workspace._keyBindingsWindows;
    for (let i=0 ; i < hotKeys.length ; i++) {
       if (hotKeys[i].enabled===true && hotKeys[i].keyCombo!==null) {
          if (hotKeyWindows[i] === this._currentWindow || (hotKeys[i].cycle===true && (hotKeys[i].description == this._app.get_name() || hotKeys[i].description == this._app.get_id()))) {
             // i.e.  "<Alt><Super><e>::" -> "Alt+Super+E"
             let keyString = hotKeys[i].keyCombo.toString();
             keyString = keyString.replace( /</g, "");
             keyString = keyString.replace( />/g, "+");
             if (keyString.endsWith("::")) {
                keyString = keyString.slice(0,-2);
             }else{
                let first = keyString.slice(0, keyString.lastIndexOf("::"));
                let end = first.slice(first.lastIndexOf("+"), first.length)
                text = text + "\n" + first.slice(0,first.lastIndexOf("+")) + end.toUpperCase();
                keyString = keyString.slice( keyString.indexOf("::")+2, keyString.length );
             }
             let end = keyString.slice(keyString.lastIndexOf("+"), keyString.length)
             text = text + "\n" + keyString.slice(0,keyString.lastIndexOf("+")) + end.toUpperCase();
          }
       }
    }

    // Disable the tooltip if there is no text or the thumbnail menu is configured to automatically popup.
    if (!text) {
       this._tooltip.set_text("");
       this._tooltip.preventShow = true;
    } else {
       this._tooltip.set_text( text );
       this._tooltip.preventShow = false;
    }
  }

  updateIcon() {
    let panelHeight = this._applet._panelHeight;

    this.iconSize = this._applet.getPanelIconSize(St.IconType.FULLCOLOR) -2;

    let icon = null;

    if (this._icon)
       this._icon.destroy();

    if (this._app) {
      let appInfo = this._app.get_app_info();
      if (appInfo) {
        let infoIcon = appInfo.get_icon();
        icon = new St.Icon({ gicon: infoIcon,
                             icon_size: this.iconSize
                           });
      } else {
        icon = this._app.create_icon_texture(this.iconSize);
      }
    } else {
      icon = new St.Icon({ icon_name: "application-default-icon",
                           icon_type: St.IconType.FULLCOLOR,
                           icon_size: this.iconSize });
    }

    this._icon = icon;
    this._iconBin.set_child(this._icon);

    if (this._applet.orientation == St.Side.LEFT || this._applet.orientation == St.Side.RIGHT) {
      panelHeight--;
    }
    // let the difference between icon size and panel size be even
    // so that the icon can be exactly centered inside the box
    if ((panelHeight - this.iconSize) & 1) {
      panelHeight--;
    }
    this._iconBin.natural_width = panelHeight;
    this._iconBin.natural_height = panelHeight;
    this._labelNumberBox.natural_width = panelHeight;
  }

  _updateNumber() {
    let setting = this._settings.getValue("display-number");
    let style = this._settings.getValue("number-style");
    let groupType = this._settings.getValue("group-windows");
    let text = "";
    let number = this._windows.length;
    // If this button was a grouped app and now there is only one window, clear the grouped flag
    if (this._grouped === GroupingType.Auto && number < 2) {
       this._grouped = GroupingType.NotGrouped;
    }
    if ( (setting == DisplayNumber.All && number >= 1)    ||
         ((setting == DisplayNumber.Smart && number >= 2) &&
         (groupType == GroupType.Grouped || groupType == GroupType.Launcher || this._grouped > GroupingType.NotGrouped))) {
      text += number;
    }

    if (style == 1 && (this._applet.orientation == St.Side.LEFT || this._applet.orientation == St.Side.RIGHT))
       style = 0;  // No space for a label based window group counter, so force the icon overlay option if it's not disabled!

    if (text == "" || style == 1) {
      this._labelNumberBox.hide();
      if (style == 1)
         this._updateLabel();
    } else if (style == 0) {
      this._labelNumber.set_text(text);
      this._labelNumberBox.show();
      let [width, height] = this._labelNumber.get_size();
      let size = Math.max(width, height);
      this._labelNumberBin.width = size;
      this._labelNumberBin.height = size;
    }
  }

  _updateLabel(actor, event) {
    // If we are in a left or right panel then we have no space for labels anyhow!
    if (this._applet.orientation == St.Side.LEFT || this._applet.orientation == St.Side.RIGHT) {
       this._updateTooltip();
       return;
    }

    let capSetting = this._settings.getValue("display-caption-for");
    let numSetting = this._settings.getValue("display-number");
    let pinnedSetting = this._settings.getValue("display-caption-for-pined");
    let minimizedSetting = this._settings.getValue("hide-caption-for-minimized");
    let style = this._settings.getValue("number-style");
    let preferredWidth = this._settings.getValue("label-width");
    let number = this._windows.length;
    let text = "";
    let width = preferredWidth;
    let needsCaption = false;
    let oneCaption = false;
    let lastButton = null;

    if (capSetting === DisplayCaption.One) {
       // Check if the next button is for the same application
       let children = this._workspace.actor.get_children();
       let idx = children.indexOf(this.actor);
       if (idx == children.length-1 || children[idx+1]._delegate._app != this._app) {
          oneCaption = true;
       } else {
          // Find the button that requires a label for this window pool
          idx++;
          while ( idx < children.length-1 && children[idx]._delegate._app === this._app ) {
             idx++;
          }
          if (children[idx]._delegate._app === this._app )
             lastButton = children[idx]._delegate;
          else
             lastButton = children[idx-1]._delegate;
       }
    }

    if (this._pinned){
       if (pinnedSetting === PinnedLabel.Always || (pinnedSetting === PinnedLabel.Focused && this._hasFocus()) || pinnedSetting === PinnedLabel.Running && number>0) {
          needsCaption = true;
       }
    } else {
       if (capSetting === DisplayCaption.All || (capSetting === DisplayCaption.Focused && this._hasFocus()) || oneCaption === true)
       {
          needsCaption = true;
       }
    }
    if (minimizedSetting === true && lastButton && lastButton._currentWindow && lastButton._currentWindow.minimized) {
       lastButton._updateLabel(); // The button with the label in this pool might need to add/remove its label
    }
    if (needsCaption === true && minimizedSetting === true && this._currentWindow && this._currentWindow.minimized) {
       if (this._windows.length > 1) {
          let minimized=0;
          for (let idx=0 ; idx < this._windows.length ; idx++ ) {
             if (this._windows[idx].minimized) 
                minimized++;
          }
          if (minimized === this._windows.length )
             needsCaption = false;
       } else if (oneCaption === true) {
          let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
          let minimized = 0;
          for (let idx=0 ; idx < btns.length ; idx++ ) {
             if (btns[idx]._windows.length === 0 || btns[idx]._windows[0].minimized)
                minimized++;
          }
          if (minimized === btns.length)
             needsCaption = false;
       } else {
          needsCaption = false;
       }
    }
    if (pinnedSetting === PinnedLabel.Focused) {
       let window = global.display.get_focus_window();
       let focus = this._workspace._lookupAppButtonForWindow(window);
       if (lastButton && lastButton._pinned && focus && focus._app === this._app) {
          // 'this' is a button in a pinned button pool. We have to allow the last button in the pool to show its label
          lastButton._updateLabel();
       } else if (this._pinned && oneCaption && focus && focus._app == this._app) {
          // 'this' is the last button in a pinned button pool when focus is with some other button in the pool
          needsCaption = true;
       }
    }

    if (needsCaption) {
       text = this.getCaption();
       if (text == "") {
          this._shrukenLabel = true;
       } else {
          this._shrukenLabel = false;
       }
    } else {
       text = "";
       this._shrukenLabel = true;
    }

    // Do we need a window number char
    if (style === 1 && ((numSetting === DisplayNumber.All && number >= 1) || ((numSetting === DisplayNumber.Smart && number >= 2) && 
       (this._settings.getValue("group-windows") === 0 || this._grouped > GroupingType.NotGrouped)))) 
    {
      if (number > 20) {
        text = "\u{24A8} " + text; // The Unicode character "(m)"
      } else {
        text = String.fromCharCode(9331+number) + " " + text; // Bracketed number
      }
    }
    // Do we need a minimized char
    if (this._currentWindow && this._currentWindow.minimized && (this._applet.indicators&IndicatorType.Minimized) && this._workspace.autoIndicatorsOff==false) {
      text = "\u{2193}" + text;  // The Unicode character "down arrow"
    } 
    // Do we need a pinned char
    if (this._pinned && (this._applet.indicators&IndicatorType.Pinned) && this._workspace.autoIndicatorsOff==false) {
        text = "\u{1F4CC}" + text; // Unicode for the "push pin" character
    }

    // If we don't have a minimum label size, calculate it now!
    if (this._minLabelSize === -1) {
       if (this._workspace.autoIndicatorsOff==true || this._applet.indicators==IndicatorType.None || (this._pinned && this._windows.length==0)) {
          this._minLabelSize = 0;
       } else {
          let minText = (this._pinned && (this._applet.indicators&IndicatorType.Pinned)) ? "\u{1F4CC}\u{2193}" : "\u{2193}";
          this._label.set_text(minText);
          let layout = this._label.get_clutter_text().get_layout();
          let [minWidth, minHeight] = layout.get_pixel_size();
          this._minLabelSize = minWidth;
       }
    }

    this._label.set_text(text);

    if (this._shrukenLabel) {
       let layout = this._label.get_clutter_text().get_layout();
       let [curWidth, curHeight] = layout.get_pixel_size();
       if (curWidth < this._minLabelSize) {
          width = this._minLabelSize+2;
       } else {
          width = curWidth+2;
       }
    }

    if (width != this._labelWidth) {
       let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
       resizeActor(this._labelBox, animTime, width, text, this);
       this._labelWidth = width;
    }
    this._updateTooltip();
  }

  _updateVisualState() {
    if (!this._currentWindow) {
      this.actor.remove_style_pseudo_class("focus");
    }
  }

  _updateOrientation() {
    this.actor.remove_style_class_name("top");
    this.actor.remove_style_class_name("bottom");
    this.actor.remove_style_class_name("left");
    this.actor.remove_style_class_name("right");
    this._labelNumberBox.set_style("padding: 1pt;");
    switch (this._applet.orientation) {
      case St.Side.LEFT:
        this.actor.add_style_class_name("left");
        this.actor.set_style("margin-left 0px; margin-right: 0px; padding: 0px");
        this._inhibitLabel = true;
        break;
      case St.Side.RIGHT:
        this.actor.add_style_class_name("right");
        this.actor.set_style("margin-left: 0px; margin-right: 0px; padding: 0px;");
        this._inhibitLabel = true;
        break;
      case St.Side.TOP:
        this.actor.add_style_class_name("top");
        this.actor.set_style("margin-top: 0px; padding-top: 0px; padding-left: 0px; padding-right: 0px;");
        this._inhibitLabel = false;
        break;
      case St.Side.BOTTOM:
        this.actor.add_style_class_name("bottom");
        this.actor.set_style("margin-bottom: 0px; padding-bottom: 0px; padding-left: 0px; padding-right: 0px;");
        this._inhibitLabel = false;
        break;
    }
    this.closeThumbnailMenu();
    this._updateLabel()
  }

  _flashButton() {
    // start over in case more than one window needs attention
    this.flashesLeft = 3;
    this.actor.add_style_class_name(STYLE_CLASS_ATTENTION_STATE);

    if (!this._flashTimeoutID) {
      this._flashTimeoutID = Mainloop.timeout_add(FLASH_INTERVAL, () => {
        if (this.actor.has_style_class_name(STYLE_CLASS_ATTENTION_STATE)) {
          this.actor.remove_style_class_name(STYLE_CLASS_ATTENTION_STATE);
        } else if (this.flashesLeft > 0) {
          this.actor.add_style_class_name(STYLE_CLASS_ATTENTION_STATE);
          this.flashesLeft--;
        }
        if (!this.flashesLeft > 0) {
          this._flashTimeoutID = null;
          return false;
        }
        return true;
      });
    }
  }

  _unflashButton() {
    this.flashesLeft = 0;
    this.actor.remove_style_class_name(STYLE_CLASS_ATTENTION_STATE);
  }

  _updateUrgentState() {
    let newUrgent = false;
    this._windows.forEach(function(win) {
      let isUrgent = win.urgent || win.demands_attention;
      let ar = this._needsAttention.indexOf(win)
      if (ar < 0 && isUrgent) {
        this._needsAttention.push(win);
        newUrgent = true;
      } else if (!isUrgent) {
        this._needsAttention.splice(ar, 1);
      }
    }, this);

    if (newUrgent) {
      this._flashButton();
    }
    if (this._needsAttention.length == 0) {
      this._unflashButton();
    }
    if (this.menu) {
       this.menu.updateUrgentState();
    }
  }

  _updateFocus() {
    for (let i = 0; i < this._windows.length; i++) {
      let metaWindow = this._windows[i];
      if (hasFocus(metaWindow, true) && !metaWindow.minimized) {
        this.actor.add_style_pseudo_class("focus");
        this.actor.remove_style_class_name(STYLE_CLASS_ATTENTION_STATE);
        this._currentWindow = metaWindow;
        this._updateLabel();
        if (metaWindow.urgent || metaWindow.demands_attention) {
          this._unflashButton();
        }
        break;
      } else {
        this.actor.remove_style_pseudo_class("focus");
        this._updateLabel();
      }
    }
  }

  _updateVisibility() {
    if ( (this._settings.getValue("group-windows")===GroupType.Launcher && !this._pinned) || this._applet.shouldAppBeHidden(this._app)) {
       this.actor.hide();
    } else if (this._windows.length || this._pinned) {
      this.actor.show();
    } else {
      //this.actor.hide();
    }
  }

  updateView() {
    this._updateCurrentWindow();
    this._updateVisualState();
    this._updateNumber();
    this._updateFocus();
    this._updateVisibility();
    this._updateTooltip();
    this.updateIcon();
  }

  destroy() {
    this._signalManager.disconnectAllSignals();
    this._tooltip.hide();
    this._tooltip.destroy();
    this.closeThumbnailMenu();
    if (this.menu) {
       this._workspace.menuManager.removeMenu(this.menu);
       this.menu.destroy();
    }
    this._contextMenuManager.removeMenu(this._contextMenu);
    this._contextMenu.destroy();
    this.actor.destroy();
    this._icon.destroy();
  }

  // Check if any of the mouse buttons are setup to display the preview menu on holding down a button
  _onButtonPress(actor, event) {
     let mouseBtn = event.get_button();
     // If the Ctrl or Shift key is held, and there is a defined action for that key+button combination then do the specified action
     if (event.has_control_modifier() || event.has_shift_modifier()) {
        let mouseActionList = this._settings.getValue("adv-mouse-list");
        let action = getKeyAndButtonMouseAction( mouseActionList, event.has_control_modifier()?Modifier.Ctrl:Modifier.Shift, Context.WindowListButton, mouseBtn );
        if (action==MouseAction.PreviewHold) {
           this.openThumbnailMenu();
           this._workspace.holdPopup = mouseBtn;
           return true;
        } else if(action) {
           return true; // Some action will be taken on release, don't attempt to so anything else here
        }
     }
     if (mouseBtn == 1 && this._windows.length > 1 && this._settings.getValue("grouped-mouse-action-btn1") == LeftClickGrouped.ToggleAndHold) {
        this.holdDelay = Mainloop.timeout_add(350, Lang.bind(this, function() {
              this.openThumbnailMenu()
              this._workspace.holdPopup = mouseBtn;
              this.holdDelay = undefined;
              this._draggable.fakeRelease();
           }
        ));
     } else if (mouseBtn == 2) {
        let action = this._settings.getValue("mouse-action-btn2");
        if (action == MouseAction.PreviewHold) {
           this.openThumbnailMenu();
           this._workspace.holdPopup = 2;
        }
     } else if (mouseBtn == 8) {
        let action = this._settings.getValue("mouse-action-btn8");
        if (action == MouseAction.PreviewHold) {
           this.openThumbnailMenu();
           this._workspace.holdPopup = 8;
        }
     } else if (mouseBtn == 9) {
        let action = this._settings.getValue("mouse-action-btn9");
        if (action == MouseAction.PreviewHold) {
           this.openThumbnailMenu();
           this._workspace.holdPopup = 9;
        }
     }
  }

  // Check if there are mouse action to be taken on button release
  _onButtonRelease(actor, event) {
    if (this.closing==true )
       return;
    let mouseBtn = event.get_button();
    // If the Ctrl or Shift key is held, and there is a defined action for that key+button combination then do the specified action
    if (event.has_control_modifier() || event.has_shift_modifier()) {
       let mouseActionList = this._settings.getValue("adv-mouse-list");
       let action = getKeyAndButtonMouseAction( mouseActionList, event.has_control_modifier()?Modifier.Ctrl:Modifier.Shift, Context.WindowListButton, mouseBtn );
       if (action!==-1) {
          this._performMouseAction(action, this._currentWindow);
          return true;
       }
    }
    if (this.menu) {
       this.removeThumbnailMenuDelay();
    }
    if (this._contextMenu.isOpen) {
      this._contextMenu.close();
    }
    // left mouse button
    if (mouseBtn == 1) {
      if (this._currentWindow) {
        let leftGroupedAction = this._settings.getValue("grouped-mouse-action-btn1");
        if (this._windows.length == 1 || leftGroupedAction == LeftClickGrouped.Toggle || leftGroupedAction == LeftClickGrouped.ToggleAndHold) {
          if (leftGroupedAction == LeftClickGrouped.ToggleAndHold) {
             if (this.holdDelay) {
                let doIt = GLib.MainContext.default().find_source_by_id(this.holdDelay);
                if (doIt) {
                   Mainloop.source_remove(this.holdDelay);
                }
             }
             this.closeThumbnailMenu();
          }
          if (hasFocus(this._currentWindow, false) && !this._currentWindow.minimized) {
            this._currentWindow.minimize();
          } else {
            this.closeThumbnailMenu();
            //Main.activateWindow(this._currentWindow);
            this._currentWindow.activate(0);
          }
        } else if (leftGroupedAction == LeftClickGrouped.Thumbnail) {
          if (this.menu && this.menu.isOpen) {
            this.closeThumbnailMenu();
          } else {
            this.openThumbnailMenu();
          }
        } else { // leftGroupedAction == LeftClickGrouped.Cycle
            if (hasFocus(this._currentWindow)) {
               if (this._nextWindow===null || this._nextWindow===this._currentWindow) {
                  this._updateCurrentWindow(); // This will set this.sortedWindows
                  this._nextWindow = this.sortedWindows[1];
               }
               let idx = this.sortedWindows.indexOf(this._nextWindow);
               Main.activateWindow(this._nextWindow);
               if (idx === this.sortedWindows.length-1) {
                  this._nextWindow = this.sortedWindows[0];
               } else {
                  this._nextWindow = this.sortedWindows[idx+1];
               }
            } else {
               this._updateCurrentWindow(); // This will set this.sortedWindows
               this._nextWindow = this.sortedWindows[1];
               Main.activateWindow(this._currentWindow);
            }
        }
      } else {
        this._startApp();
      }
    } else if (mouseBtn == 2) {
      // middle mouse button
      let action = this._settings.getValue("mouse-action-btn2");
      this._performMouseAction(action, this._currentWindow);
    } else if (mouseBtn == 3) {
      // right mouse button, show context menu
      if (global.settings.get_boolean("panel-edit-mode")===false) {
         this._populateContextMenu();
         this._contextMenu.open();
         this._updateFocus();
      }
    } else if (mouseBtn == 8) {
       // back mouse button
       let action = this._settings.getValue("mouse-action-btn8");
       this._performMouseAction(action, this._currentWindow);
    } else if (mouseBtn == 9) {
       // forward mouse button
       let action = this._settings.getValue("mouse-action-btn9");
       this._performMouseAction(action, this._currentWindow);
    }
  }

  // zoom in and out the preview menu based on the movement of the mouse scroll wheel
  _onScrollEvent(actor, event) {
     let wheelSetting = this._settings.getValue("wheel-adjusts-preview-size");
     if (wheelSetting===ScrollWheelAction.Off || !this.menu || !this.menu.isOpen) {
        return;
     }
     let numThumbs = this.menu.numThumbs;
     let direction = event.get_scroll_direction();
     if (numThumbs > this.menu.numMenuItems && numThumbs > 2 && direction == 0 /*UP*/) {
        numThumbs -= 0.5;
     } else if (numThumbs < 15 && direction == 1 /*Down*/){
        numThumbs += 0.5;
     } else {
        return;
     }
     this.menu.numThumbs = numThumbs;
     this.menu.recalcItemSizes();
     if (wheelSetting===ScrollWheelAction.OnGlobal) {
        this._workspace.thumbnailSize = numThumbs;
     } else if (wheelSetting===ScrollWheelAction.OnApplication) {
        let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
        for (let idx=0 ; idx < btns.length ; idx++ ) {
           btns[idx].menu.numThumbs = numThumbs;
        }
     }
  }

  // Perform the action defined by the passed in action integer
  _performMouseAction(action, window) {
      switch (action) {
        case MouseAction.Preview:
           let curMenu = this._workspace.currentMenu;
           if (curMenu && curMenu.isOpen && this._app === curMenu._appButton._app) {
              this.closeThumbnailMenu();
           } else {
              if (curMenu) {
                 this.closeThumbnailMenu();
              }
              this.openThumbnailMenu();
           }
           break;
        case MouseAction.PreviewHold:
           this.closeThumbnailMenu();
           break;
        case MouseAction.Close:
           if (window) {
              window.delete(global.get_current_time());
           }
           break;
        case MouseAction.Minimize:
           if (window) {
              if (window.minimized===false) {
                 window.minimize();
              } else {
                this.closeThumbnailMenu();
                Main.activateWindow(window);
              }
           }
           break;
        case MouseAction.Maximize:
           if (window) {
              if (window.get_maximized()) {
                 window.unmaximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL)
              } else {
                 window.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
              }
           }
           break;
        case MouseAction.Group:
           let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
           this.closeThumbnailMenu();
           if (btns.length > 1) {
              this._workspace._groupOneApp(btns, GroupingType.ForcedOn);
           } else if (btns.length == 1 && btns[0]._windows.length > 1) {
              this._workspace._ungroupOneApp(this, GroupingType.ForcedOff);
           }
           break;
        case MouseAction.New:
           this._startApp();
           break;
        case MouseAction.MoveWorkspace1:
           if (window) {
              if (this.menu != undefined) this.menu.removeWindow(window);
              window.change_workspace_by_index(0, false);
           }
           break;
        case MouseAction.MoveWorkspace2:
           if (window && this._applet._workspaces.length <= 2) {
              if (this.menu != undefined) this.menu.removeWindow(window);
              window.change_workspace_by_index(1, false);
           }
           break;
        case MouseAction.MoveWorkspace3:
           if (window && this._applet._workspaces.length <= 3)
              if (this.menu != undefined) this.menu.removeWindow(window);
              window.change_workspace_by_index(2, false);
           break;
        case MouseAction.MoveWorkspace4:
           if (window && this._applet._workspaces.length <= 4)
              if (this.menu != undefined) this.menu.removeWindow(window);
              window.change_workspace_by_index(3, false);
           break;
        case MouseAction.WS_Visibility:
           if (window.is_on_all_workspaces()) {
              window.unstick();
           } else {
              window.stick();
           }
           break;
        case MouseAction.LastFocused:
           if (this._windows.length > 1){
              this.closeThumbnailMenu();
              Main.activateWindow(this._currentWindow);
           } else if (this._windows.length == 1) {
              let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
              for (let idx=0 ; idx < btns.length ; idx++ ) {
                 if (btns[idx].appLastFocus === true) {
                    this.closeThumbnailMenu();
                    Main.activateWindow(btns[idx]._currentWindow);
                    return;
                 }
              }
              this.closeThumbnailMenu();
              Main.activateWindow(this._currentWindow);
           }
           break;
        case MouseAction.MoveMonitor1:
           if (window && this._applet.xrandrMonitors[0] != null) {
              window.move_to_monitor(0);
           }
           break;
        case MouseAction.MoveMonitor2:
           if (window && this._applet.xrandrMonitors[1] != null) {
              window.move_to_monitor(1);
           }
           break;
        case MouseAction.MoveMonitor3:
           if (window && this._applet.xrandrMonitors[2] != null) {
              window.move_to_monitor(2);
           }
           break;
        case MouseAction.MoveMonitor4:
           if (window && this._applet.xrandrMonitors[3] != null) {
              window.move_to_monitor(3);
           }
           break;
        case MouseAction.MoveCurrMonitor:
           if (window) {
              if (this._applet.panel.monitorIndex != window.get_monitor()) {
                 window.move_to_monitor(this._applet.panel.monitorIndex);
              } else {
                 let nMonitors = Main.layoutManager.monitors.length;
                 for (let i=this._applet.panel.monitorIndex+1 ; i != this._applet.panel.monitorIndex ; i++) {
                    if (i >= Main.layoutManager.monitors.length) {
                       i=-1;
                    } else {
                       if (this._applet.xrandrMonitors[i] != null) {
                          window.move_to_monitor(i);
                          return;
                       }
                    }
                 }
              }
           }
           break;
        case MouseAction.ShoveTitlebar:
           if (window) {
              window.shove_titlebar_onscreen();
           }
           break;
        case MouseAction.MovePrevWorkspace:
           {
           let nWorkspace = this._applet._workspaces.length;
           if (window && nWorkspace > 1) {
              let curWorkspace = this._applet.getCurrentWorkSpace()._wsNum;
              if (curWorkspace==0)
                 curWorkspace=nWorkspace;
              window.change_workspace_by_index(curWorkspace-1, false);
           }
           }
           break;
        case MouseAction.MoveNextWorkspace:
           {
           let nWorkspace = this._applet._workspaces.length;
           if (window && nWorkspace > 1) {
              let curWorkspace = this._applet.getCurrentWorkSpace()._wsNum;
              if (curWorkspace==nWorkspace-1)
                 curWorkspace=-1;
              window.change_workspace_by_index(curWorkspace+1, false);
           }
           }
           break;
        case MouseAction.MovePrevMonitor:
           {
           let nMonitors = Main.layoutManager.monitors.length;
           let curMonitor = window.get_monitor();
           if (window && nMonitors > 1 && this._applet.xrandrMonitors[curMonitor] != null) {
              for ( curMonitor--; true ; curMonitor--) {
                 if (curMonitor<0 )
                    curMonitor=nMonitors-1;
                 if (this._applet.xrandrMonitors[curMonitor] != null) {
                    window.move_to_monitor(curMonitor);
                    return;
                 }
              }
           }
           }
           break;
        case MouseAction.MoveNextMonitor:
           {
           let nMonitors = Main.layoutManager.monitors.length;
           let curMonitor = window.get_monitor();
           if (window && nMonitors > 1 && this._applet.xrandrMonitors[curMonitor] != null) {
              for ( curMonitor++; true ; curMonitor++) {
                 if (curMonitor>nMonitors-1 )
                    curMonitor=0;
                 if (this._applet.xrandrMonitors[curMonitor] != null) {
                    window.move_to_monitor(curMonitor);
                    return;
                 }
              }
           }
           }
           break;
      }
  }

  /*
  _animateIcon(animationTime) {
    Tweener.addTween(this._icon, {
      opacity: 70,
      transition: "easeOutExpo",
      time: animationTime * 0.2,
      onCompleteScope: this,
      onComplete: Lang.bind(this, function() {
        Tweener.addTween(this._icon, {
          opacity: 255,
          transition: "easeOutBounce",
          time: animationTime * 0.8
        })
      })
    });
  }
  */

    _animateIcon(step) {
        if (step >= 3) return;
        this._icon.set_pivot_point(0.5, 0.5);
        Tweener.addTween(this._icon,
                         { scale_x: 0.7,
                           scale_y: 0.7,
                           time: 0.2,
                           transition: 'easeOutQuad',
                           onComplete() {
                               Tweener.addTween(this._icon,
                                                { scale_x: 1.0,
                                                  scale_y: 1.0,
                                                  time: 0.2,
                                                  transition: 'easeOutQuad',
                                                  onComplete() {
                                                      this._animateIcon(step + 1);
                                                  },
                                                  onCompleteScope: this
                                                });
                           },
                           onCompleteScope: this
                         });
    }

  _startApp() {
    this._app.open_new_window(-1);
    //let animationTime = this._settings.getValue("animation-time") / 1000;
    //this._animateIcon(animationTime);
    this._animateIcon(0);
  }

  _onEnterEvent() {
    let state = this._windows.some(function(win) {
      return win.urgent || win.demands_attention;
    });
    if (state) {
      this.actor.set_hover(false);
    } else {
      this.actor.set_hover(true);
    }
    let curMenu = this._workspace.currentMenu;
    /*
    if (curMenu && curMenu != this.menu && curMenu.isOpen) {
       let groupSetting = this._settings.getValue("group-windows");
       if (groupSetting===GroupType.Pooled || groupedSetting===GroupType.Auto && curMenu._appButton._app === this._app) {
          // Just keep the same menu since it's for the same pool and the current thumbnail menu is still appropriate
          this.removeThumbnailMenuDelay();
          return;
       }
    }
    */
    if (curMenu && curMenu != this.menu && curMenu.isOpen) {
       let holdPopup = this._workspace.holdPopup;
       this.closeThumbnailMenu();
       this.openThumbnailMenu();
       this._workspace.holdPopup = holdPopup;
    } else if (this._windows.length > 0 && this._settings.getValue("menu-show-on-hover")) {
      this.openThumbnailMenuDelayed();
    }
  }

  _onLeaveEvent() {
    let curMenu = this._workspace.currentMenu;
    if (curMenu) {
       this.closeThumbnailMenuDelayed();
    } else {
       this.removeThumbnailMenuDelay();
    }
    if (!this._contextMenu.isOpen && (!this.menu || !this.menu.isOpen)) {
       this.actor.set_hover(false);
    }
    //if (this._mousePosUpdateLoop) {
    //  Mainloop.source_remove(this._mousePosUpdateLoop);
    //  this._mousePosUpdateLoop = 0;
    //}
  }

  _onMinimized(metaWindow) {
    if (this._currentWindow == metaWindow) {
      this._updateFocus();
    }
  }

  _hasFocus() {
    for (let i = 0; i < this._windows.length; i++) {
      if (hasFocus(this._windows[i])) {
        return true;
      }
    }
    return false;
  }

  _populateContextMenu(metaWindow=undefined) {
    this._contextMenu.removeAll();
    let item;
    let groupingType = this._settings.getValue("group-windows");

    // applet-wide
    let subMenu = new PopupMenu.PopupSubMenuMenuItem(_("Applet Preferences"));

    this._contextMenu.addMenuItem(subMenu);

    item = new PopupMenu.PopupIconMenuItem(_("About..."), "dialog-question", St.IconType.SYMBOLIC);
    item.connect("activate", Lang.bind(this._applet, this._applet.openAbout));
    subMenu.menu.addMenuItem(item);

    item = new PopupMenu.PopupIconMenuItem(_("Configure..."), "system-run", St.IconType.SYMBOLIC);
    item.connect("activate", Lang.bind(this._applet, this._applet.configureApplet));
    subMenu.menu.addMenuItem(item);

    item = new PopupMenu.PopupIconMenuItem(_("Remove '%s'").format(_(this._applet._meta.name)), "edit-delete", St.IconType.SYMBOLIC);
    item.connect("activate", Lang.bind(this, function() {
        new ModalDialog.ConfirmDialog(_("Do you really want to remove this instance of CassiaWindowList?"), Lang.bind(this, function() {
            AppletManager._removeAppletFromPanel(this._applet._uuid, this._applet.instance_id);
        })).open(global.get_current_time());
    }));
    subMenu.menu.addMenuItem(item);

    // app-wide
    this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    item = new PopupMenu.PopupIconMenuItem(_("Open new window"), "video-display-symbolic", St.IconType.SYMBOLIC);
    item.connect("activate", Lang.bind(this, this._startApp));
    this._contextMenu.addMenuItem(item);

    if (this._settings.getValue("display-pinned") && !this._app.is_window_backed()) {
      let iconName = this._pinned ? "starred" : "non-starred";
      item = new PopupMenu.PopupSwitchIconMenuItem(_("Pin to this workspace"), this._pinned, iconName, St.IconType.SYMBOLIC);
      item.connect("toggled", Lang.bind(this, function(menuItem, state) {
        if (state) {
          this._workspace.pinAppButton(this);
          menuItem.setIconSymbolicName("starred");
        } else {
          this._workspace.unpinAppButton(this);
          if (this._windows == 0 || this._settings.getValue("group-windows")===GroupType.Launcher)
             this._contextMenu.close();
          else
             menuItem.setIconSymbolicName("non-starred");
        }
      }));
      this._contextMenu.addMenuItem(item);

      let pinSettings = this._settings.getValue("pinned-apps");
      let appId = this._app.get_id();
      if (global.screen.n_workspaces == 2) {
        let i = 0
        if (i == this._workspace._wsNum) {
            i++;
        }
        let name = "Pin to " + Main.getWorkspaceName(i);
        let pinned = pinSettings[i].indexOf(appId) >= 0;
        let iconName = pinned ? "starred" : "non-starred";
        let ws = new PopupMenu.PopupSwitchIconMenuItem(name, pinned, iconName, St.IconType.SYMBOLIC);
        let j = i;
        ws.connect("toggled", Lang.bind(this, function(menuItem, state) {
        if (state) {
          this._applet._workspaces[j].pinAppId(appId);
          menuItem.setIconSymbolicName("starred");
        } else {
          this._applet._workspaces[j].unpinAppId(appId);
          menuItem.setIconSymbolicName("non-starred");
        }
        }));
        this._contextMenu.addMenuItem(ws);
      }else if (global.screen.n_workspaces > 2) {
        item = new PopupMenu.PopupSubMenuMenuItem(_("Pin to other workspaces"));
        for (let i = 0; i < global.screen.n_workspaces; i++) {
          if (i != this._workspace._wsNum) {
             let name = Main.getWorkspaceName(i);
             let pinned = pinSettings[i].indexOf(appId) >= 0;
             let iconName = pinned ? "starred" : "non-starred";
             let ws = new PopupMenu.PopupSwitchIconMenuItem(name, pinned, iconName, St.IconType.SYMBOLIC);
             let j = i;
             ws.connect("toggled", Lang.bind(this, function(menuItem, state) {
               if (state) {
                 this._applet._workspaces[j].pinAppId(appId);
                 menuItem.setIconSymbolicName("starred");
               } else {
                 this._applet._workspaces[j].unpinAppId(appId);
                 menuItem.setIconSymbolicName("non-starred");
               }
             }));
             item.menu.addMenuItem(ws);
          }
        }

        let pinAll = new PopupMenu.PopupMenuItem(_("Pin to all workspaces"));
        pinAll.connect("activate", Lang.bind(this,
           function() {
              for (let i = 0; i < this._applet._workspaces.length; i++) {
                 if (i != this._workspace._wsNum || !this._pinned) {
                    this._applet._workspaces[i].pinAppId(appId);
                 }
              }
           }));
        item.menu.addMenuItem(pinAll);
        this._contextMenu.addMenuItem(item);
      }
    }

    // If this is a pinned button without open windows, add a item to allow creating a Hotkey right on the root menu
    if (this._pinned && !this._currentWindow && metaWindow === undefined) {
      let hotKeys = this._applet._keyBindings;
      let appHasExistingHotkey = false;
      for (let i=0 ; i < hotKeys.length ; i++) {
         if (this._app.get_id() == hotKeys[i].description) {
            appHasExistingHotkey = true;
         }
      }
      if (appHasExistingHotkey===false && !this._app.is_window_backed()) {
         this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
         item = new PopupMenu.PopupIconMenuItem(_("Add new Hotkey for")+" \""+this._app.get_id()+"\"", "input-keyboard", St.IconType.SYMBOLIC);
         item.connect("activate", Lang.bind(this, function() {
               hotKeys.push( {enabled:false, cycle:true, keyCombo:"", description:this._app.get_id()} );
               this._settings.setValue("hotkey-bindings", hotKeys);
               this._applet.configureApplet(3);
               }));
         this._contextMenu.addMenuItem(item);
      }
    }

    // Recent File menu items
    let recentFiles = this.getRecentFiles();
    if (recentFiles.length > 0) {
      this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      item = new PopupMenu.PopupSubMenuMenuItem(_("Recent files"));
      this._contextMenu.addMenuItem(item);
      for (let i=0 ; i < recentFiles.length ; i++) {
         let fileItem = new PopupMenu.PopupIconMenuItem(recentFiles[i].get_short_name(), "list-add", St.IconType.SYMBOLIC);
         fileItem.connect("activate", Lang.bind(this, function() {
               Gio.app_info_launch_default_for_uri(recentFiles[i].get_uri(), global.create_app_launch_context());
               }));
         item.menu.addMenuItem(fileItem);
      }
    }

    let appInfo = this._app.get_app_info();
    if (appInfo != null) {
      let actions = appInfo.list_actions();
      if (actions.length > 0) {
        let appId = this.get_app_id();

        if (appId == "nemo.desktop" || appId == "nemo-home.desktop") {
          let defaultPlaces = Main.placesManager.getDefaultPlaces();
          let bookmarks = Main.placesManager.getBookmarks();
          let places = defaultPlaces.concat(bookmarks);

          if (places.length > 0) {
            this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            let placesMenu = new PopupMenu.PopupSubMenuMenuItem(_("Places"));

            for (let i = 0; i < places.length; i++) {
              let place = places[i];
              let placeItem = new PopupMenu.PopupMenuItem(place.name);
              placeItem.connect("activate", Lang.bind(this, function() {
                place.launch();
              }));
              placesMenu.menu.addMenuItem(placeItem);
            }
            this._contextMenu.addMenuItem(placesMenu);
          }
        }

        this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        for (let i = 0; i < actions.length; i++) {
          let action = actions[i];
          let displayName = appInfo.get_action_name(action);
          let actionProp = action.replace(/([A-Z])/g, '_$1').replace(/-/g, '_').toLowerCase();
          if (actionProp[0] == '_') actionProp = actionProp.slice(1);
          let actionItem;
          if (ICON_NAMES.hasOwnProperty(actionProp)) {
             actionItem = new PopupMenu.PopupIconMenuItem(displayName, ICON_NAMES[actionProp], St.IconType.SYMBOLIC);
          } else {
             //log( actionProp+": property not found!" );
             actionItem = new PopupMenu.PopupIconMenuItem(displayName, "", St.IconType.SYMBOLIC);
          }
          actionItem.connect("activate", Lang.bind(this, function() {
            appInfo.launch_action(action, global.create_app_launch_context());
          }));
          this._contextMenu.addMenuItem(actionItem);
        }
      }
    }

    if (this._currentWindow || metaWindow != undefined) {
      if (metaWindow == undefined) {
        metaWindow = this._currentWindow;
      }
      this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      // window ops for workspaces
      if (metaWindow.is_on_all_workspaces()) {
        this._contextMenu.addAction(_("Only on this workspace"), Lang.bind(this, function() {metaWindow.unstick()}));
      } else if (this._applet._workspaces.length > 1) {
        this._contextMenu.addAction(_("Visible on all workspaces"), Lang.bind(this, function() {metaWindow.stick()}));
        item = new PopupMenu.PopupSubMenuMenuItem(_("Move to another workspace"));
        this._contextMenu.addMenuItem(item);

        for (let i = 0; i < this._applet._workspaces.length; i++) {
          if (i != this._workspace._wsNum) {
            // Make the index a local variable to pass to function
            let j = i;
            let name = Main.workspace_names[i] ? Main.workspace_names[i] : Main._makeDefaultWorkspaceName(i);
            let ws = new PopupMenu.PopupMenuItem(name);
            ws.connect("activate", Lang.bind(this, function() {
                metaWindow.change_workspace_by_index(j, false);
            }));
            item.menu.addMenuItem(ws);
          }
        }
      }

      let nMonitors = Main.layoutManager.monitors.length;
      if (nMonitors > 1) {
        item = new PopupMenu.PopupSubMenuMenuItem(_("Move to another monitor"));
        this._contextMenu.addMenuItem(item);
        let monitor = metaWindow.get_monitor();
        for (let i = 0; i < nMonitors; i++) {
          if (i == monitor) {
            continue;
          }
          let j = i;
          let name = _("Monitor") + " " + j;
          if (this._applet.xrandrMonitors[j] != null) {
            name += " (" + this._applet.xrandrMonitors[j] + ")";
          }

          let monitorItem = new PopupMenu.PopupMenuItem(name);
          monitorItem.connect("activate", Lang.bind(this, function() {
            metaWindow.move_to_monitor(j);
          }));
          item.menu.addMenuItem(monitorItem);
        }
      }

      // Menu options to attach a hotkey to a window
      this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      let appHasExistingHotkey = false;
      let hotKeys = this._applet._keyBindings;
      item = null;
      for (let i=0 ; i < hotKeys.length ; i++) {
         if (hotKeys[i].enabled===true && (hotKeys[i].description.endsWith(".desktop")!==true || (hotKeys[i].cycle===false && hotKeys[i].description==this._app.get_id()))) {
            let idx = i;
            let keyString;
            if (hotKeys[i].keyCombo!==null) {
               keyString = hotKeys[i].keyCombo.toString();
               if (keyString.endsWith("::")) {
                  keyString = keyString.slice(0,-2);
               }
            } else {
               keyString = _("unassigned");
            }
            let icon;
            if (this._workspace._keyBindingsWindows.length > i && this._workspace._keyBindingsWindows[i] === metaWindow) {
               icon = "checkbox-checked"; //"emblem-default";
            } else if (this._workspace._keyBindingsWindows.length > i && this._workspace._keyBindingsWindows[i] != undefined) {
               icon = "checkbox-mixed"; //"selection-mode"; //"emblem-ok";
            } else {
               icon = "checkbox"; //"system-shutdown"; //"input-keyboard";
            }
            if (item === null) {
               item = new PopupMenu.PopupSubMenuMenuItem(_("Assign window to a hotkey"));
               this._contextMenu.addMenuItem(item);
            }
            let text = (hotKeys[i].description)?hotKeys[i].description+" ("+keyString+")":keyString;
            let hotKeyItem = new PopupMenu.PopupIconMenuItem(text, icon, St.IconType.SYMBOLIC);
            hotKeyItem.connect("activate", Lang.bind(this, function() {
               //log( "Setting hotkey #"+idx+" to activate "+this._app.get_name() );
               let workspace = this._applet.getCurrentWorkSpace();
               let oldButton = (workspace._keyBindingsWindows[idx]) ? workspace._lookupAppButtonForWindow(workspace._keyBindingsWindows[idx]) : null;
               workspace._keyBindingsWindows[idx] = metaWindow;
               this._updateTooltip();
               if (oldButton) oldButton._updateTooltip();
               }));
            item.menu.addMenuItem(hotKeyItem);
         }
         if (this._app.get_id() == hotKeys[i].description || metaWindow.get_title() == hotKeys[i].description) {
            appHasExistingHotkey = true;
         }
      }
      if (appHasExistingHotkey===false && !this._app.is_window_backed()) {
         if (item === null) {
            item = new PopupMenu.PopupSubMenuMenuItem(_("Assign window to a hotkey"));
            this._contextMenu.addMenuItem(item);
         }
         let hotKeyItem = new PopupMenu.PopupIconMenuItem(_("Add new Hotkey for")+" \""+this._app.get_id()+"\"", "list-add", St.IconType.SYMBOLIC);
         hotKeyItem.connect("activate", Lang.bind(this, function() {
               hotKeys.push( {enabled:false, cycle:true, keyCombo:"", description:this._app.get_id()} );
               this._settings.setValue("hotkey-bindings", hotKeys);
               this._applet.configureApplet(3);
               }));
         item.menu.addMenuItem(hotKeyItem);
      }

      if (groupingType != GroupType.Launcher) {
         // Menu options for changing the type of label text
         let customLabel = this._settings.getValue("custom-label-app");
         let customLabelType = this._settings.getValue("custom-label-type");
         let idx;
         for (idx=0 ; idx < customLabel.length ; idx++) {
            if (customLabel[idx] == this._app.get_name() || customLabel[idx] == this._app.get_id()) {
               break;
            }
         }
         if (this._shrukenLabel === false || (idx < customLabel.length && customLabelType[idx] == CaptionType.None) ) {
            item = new PopupMenu.PopupSubMenuMenuItem(_("Change application label contents"));
            this._contextMenu.addMenuItem(item);
            if (idx != customLabel.length) {
               let remove = new PopupMenu.PopupMenuItem(_("Remove custom setting"));
               remove.connect("activate", Lang.bind(this, function() {
                     this.removeCustomLabel(idx, customLabel, customLabelType);
                     }));
               item.menu.addMenuItem(remove);
            }
            if (idx == customLabel.length || customLabelType[idx] != CaptionType.Title) {
               let forceTitle = new PopupMenu.PopupMenuItem(_("Use window title"));
               forceTitle.connect("activate", Lang.bind(this, function() {
                     this.setCustomLabel(idx, CaptionType.Title, customLabel, customLabelType);
                     }));
               item.menu.addMenuItem(forceTitle);
            }
            if (idx == customLabel.length || customLabelType[idx] != CaptionType.Name) {
               let forceTitle = new PopupMenu.PopupMenuItem(_("Use application name"));
               forceTitle.connect("activate", Lang.bind(this, function() {
                     this.setCustomLabel(idx, CaptionType.Name, customLabel, customLabelType);
                     }));
               item.menu.addMenuItem(forceTitle);
            }
            if (idx == customLabel.length || customLabelType[idx] != CaptionType.None) {
               let forceTitle = new PopupMenu.PopupMenuItem(_("No label"));
               forceTitle.connect("activate", Lang.bind(this, function() {
                     this.setCustomLabel(idx, CaptionType.None, customLabel, customLabelType);
                     }));
               item.menu.addMenuItem(forceTitle);
            }
         }

         // Menu options for grouping or ungrouping a button
         this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
         if (this._windows.length > 1) {
            item = new PopupMenu.PopupMenuItem(_("Ungroup application windows"));
            item.connect("activate", Lang.bind(this, function() {
                  let type = GroupingType.NotGrouped;
                  if (this._workspace._areButtonsShrunk())
                     type = GroupingType.ForcedOff;
                  this._workspace._ungroupOneApp(this, type); 
               }));
            this._contextMenu.addMenuItem(item);
         } else {
            let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
            if (btns && btns.length > 1) {
              item = new PopupMenu.PopupMenuItem(_("Group application windows"));
              item.connect("activate", Lang.bind(this, function() { this._workspace._groupOneApp(btns, GroupingType.ForcedOn); }));
              this._contextMenu.addMenuItem(item);
            }
         }
      }

      // Menu option to Allow/Prevent windows from Automatic grouping/ungoruping 
      if (this._settings.getValue("group-windows")===GroupType.Auto) {
         let auto = !(this._grouped == GroupingType.ForcedOff || this._grouped == GroupingType.ForcedOn);
         item = new PopupMenu.PopupSwitchMenuItem(_("Automatic grouping/ungrouping"), auto);
         item.connect("toggled", Lang.bind(this, function(menuItem, state) {
           if (state) {
              // Automatic has been enabled
              if (this._grouped > GroupingType.NotGrouped) {
                 this._grouped=GroupingType.Auto;
                 this._workspace._tryExpandingAppGroups();
              } else {
                 let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
                 for (let i=0 ; i<btns.length ; i++)
                    btns[i]._grouped = GroupingType.NotGrouped;
              }
           } else {
              // Automatic has been disabled
              if (this._grouped > GroupingType.NotGrouped) {
                 this._grouped = GroupingType.ForcedOn;
              } else {
                 let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
                 for (let i=0 ; i<btns.length ; i++)
                    btns[i]._grouped = GroupingType.ForcedOff;
              }
           }
         }));
         this._contextMenu.addMenuItem(item);
      }

      this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      // window specific
      if (!hasFocus(metaWindow)) {
        item = new PopupMenu.PopupIconMenuItem(_("Restore"), "view-sort-descending", St.IconType.SYMBOLIC);
        item.connect("activate", Lang.bind(this, function() { Main.activateWindow(metaWindow); }));
        this._contextMenu.addMenuItem(item);
      } else {
        item = new PopupMenu.PopupIconMenuItem(_("Minimize"), "view-sort-ascending", St.IconType.SYMBOLIC);
        item.connect("activate", Lang.bind(this, function() { metaWindow.minimize()}));
        this._contextMenu.addMenuItem(item);
      }

      if (metaWindow.get_maximized()) {
        item = new PopupMenu.PopupIconMenuItem(_("Unmaximize"), "view-restore", St.IconType.SYMBOLIC);
        item.connect("activate", Lang.bind(this, function() { metaWindow.unmaximize(Meta.MaximizeFlags.VERTICAL | Meta.MaximizeFlags.HORIZONTAL)}));
        this._contextMenu.addMenuItem(item);
      }

      this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      if (this._windows.length > 1) {
        item = new PopupMenu.PopupIconMenuItem(_("Close others"), "application-exit", St.IconType.SYMBOLIC);
        item.connect("activate", Lang.bind(this, function() {
          let curIdx = this._windows.indexOf(metaWindow);
          this._windows.splice(curIdx, 1);
          this._windows.push(metaWindow);
          for (let i = this._windows.length - 2; i >= 0; i--) {
            this._windows[i].delete(global.get_current_time());
          }
        }));
        this._contextMenu.addMenuItem(item);

        item = new PopupMenu.PopupIconMenuItem(_("Close all"), "window-close", St.IconType.SYMBOLIC);
        item.connect("activate", Lang.bind(this, function() {
          for (let i = this._windows.length - 1; i >= 0; i--) {
            this._windows[i].delete(global.get_current_time());
          }
        }));
        this._contextMenu.addMenuItem(item);
      }

      item = new PopupMenu.PopupIconMenuItem(_("Close"), "edit-delete", St.IconType.SYMBOLIC);
      item.connect('activate', Lang.bind(this, function() {
        metaWindow.delete(global.get_current_time());
      }));
      this._contextMenu.addMenuItem(item);
    }
  }

  openThumbnailMenu(){
     if (this._windows.length > 0 && !this._contextMenu.isOpen) {
        this.removeThumbnailMenuDelay();
        this.menu.openMenu();
        this._workspace.currentMenu = this.menu;
        this.actor.set_hover(true);
     }
  }

  openThumbnailMenuDelayed(){
     if (!this.menu.isOpen) {
        this.removeThumbnailMenuDelay();
        this._workspace._delayId = Mainloop.timeout_add(this._settings.getValue("preview-timeout-show"), Lang.bind(this, this.openThumbnailMenu));
     }
  }

  closeThumbnailMenu(){
     if (this.menu && this.menu.isOpen) {
        this.removeThumbnailMenuDelay();
        this.menu.closeMenu();
        this._workspace.currentMenu = undefined;
        this.actor.set_hover(false);
     } else if (this._workspace.currentMenu!==this.menu) {
        this._workspace.closeThumbnailMenu();
     }
  }

  closeThumbnailMenuDelayed(){
     this.removeThumbnailMenuDelay();
     this._workspace._delayId = Mainloop.timeout_add(this._settings.getValue("preview-timeout-hide"), Lang.bind(this, this.closeThumbnailMenu));
  }

  removeThumbnailMenuDelay(){
     if (this._workspace._delayId)
        this._workspace.removeThumbnailMenuDelay();
  }

  // Return a list of the Recent Files that match the mime type of this buttons application
  getRecentFiles(){
     let ret = [];
     let items = Gtk.RecentManager.get_default().get_items();
     for ( let i=0 ; i<items.length ; i++ ) {
        let appInfo = Gio.app_info_get_default_for_type(items[i].get_mime_type(), false);
        if (appInfo && this._app.get_id() === appInfo.get_id()){
           ret.push(items[i]);
        }
     }
     return ret;
  }

  getCaption(){
    let text;
    let customLabel = this._settings.getValue("custom-label-app");
    let customLabelType = this._settings.getValue("custom-label-type");
    let capType = this._settings.getValue("caption-type");
    if (customLabel.length > 0) {
       for (let idx=0 ; idx < customLabel.length ; idx++) {
          if (customLabel[idx] == this._app.get_name() || customLabel[idx] == this._app.get_id()) {
             //log( "Setting caption type to " + customLabelType[idx] + " for window " + this._app.get_name() );
             capType = customLabelType[idx];
             break;
          }
       }
    }
    if (capType === CaptionType.None)
       return "";

    if (capType === CaptionType.Title && this._currentWindow) {
      text = this._currentWindow.get_title();
    }
    if (!text) {
      text = this._app.get_name();
    }
    if (!text) {
      text = "?";
    }
    return text;
  }

  addCustomLabel(type, customLabel, customLabelType){
    //log( "Adding a custom label for " +this._app.get_name()+ " to be " +type );
    customLabel.push(this._app.get_name());
    customLabelType.push(type);
    let newCustomLabel = customLabel.slice();
    let newCustomLabelType = customLabelType.slice();
    this._settings.setValue("custom-label-app", newCustomLabel);
    this._settings.setValue("custom-label-type", newCustomLabelType);
    this.updateAllAppButtonLabels();
  }

  setCustomLabel(idx, type, customLabel, customLabelType){
    //log( "setting existing custom label for "+customLabel[idx]+" to type "+type+" at " +idx );
    if (idx >= customLabel.length) {
       this.addCustomLabel(type, customLabel, customLabelType);
    } else {
       customLabelType[idx] = type;
       let newCustomLabelType = customLabelType.slice();
       this._settings.setValue("custom-label-type", newCustomLabelType);
       this.updateAllAppButtonLabels();
    }
  }

  removeCustomLabel(idx, customLabel, customLabelType){
    //log( "Removing custom label for "+customLabel[idx]+" at "+idx );
    customLabel.splice(idx, 1);
    customLabelType.splice(idx, 1);
    let newCustomLabel = customLabel.slice();
    let newCustomLabelType = customLabelType.slice();
    this._settings.setValue("custom-label-app", newCustomLabel);
    this._settings.setValue("custom-label-type", newCustomLabelType);
    this.updateAllAppButtonLabels();
  }

  updateAllAppButtonLabels(){
     let btns = this._workspace._lookupAllAppButtonsForApp(this._app);
     for (let idx=0 ; idx < btns.length ; idx++) {
        btns[idx]._updateLabel();
     }
  }
}

// Represents a windowlist on a workspace (one for each workspace)
class Workspace {
  constructor(applet, wsNum) {
    this._applet = applet;
    this._wsNum = wsNum;
    this._settings = this._applet._settings;
    this._signalManager = new SignalManager.SignalManager(null);

    this.actor = new St.BoxLayout({ style_class: "window-list-box", track_hover: false, hover: false });
    this.actor.set_style('border:0px;padding:0px;margin:0px');
    this.actor._delegate = this;

    this.maxSize = this._settings.getValue("label-width"); // The size where buttons start shrinking (estimated until we see shrinking button widths)
    this.autoIndicatorsOff = false;  // Were the indicator characters automatically removed to save space
    this._status = 0;  // 0=Normal   1=Grouping/Ungrouping in progress

    //this.dragInProgress = false;
    this.prevDragLocation = undefined;

    this._windowTracker = Cinnamon.WindowTracker.get_default();
    this._appSys = Cinnamon.AppSystem.get_default();

    this.menuManager = new ThumbnailMenuManager(this);
    this.currentMenu = undefined; // The currently open Thumbnail menu
    this.thumbnailSize = this._settings.getValue("number-of-unshrunk-previews");

    this._appButtons = [];
    this._settings = this._applet._settings;
    this._currentFocus = null;  // The WindowListButton that handles the window with the focus

    this._keyBindingsWindows = [];

    let pinSetting = this._settings.getValue("pinned-apps");
    if (pinSetting.length < wsNum) {
      let newSetting = pinSetting.slice();
      newSetting.push([]);
      this._settings.setValue("pinned-apps", newSetting);
    }

    this._signalManager = new SignalManager.SignalManager(null);
  }

  onAddedToPanel() {
    if (this._settings.getValue("display-pinned")) {
      this._updatePinnedApps();
    }

    this._updateAllWindowsForMonitor();

    this.onOrientationChanged(this._applet.orientation);

    //this._signalManager.connect(this._windowTracker, "notify::focus-app", this._updateFocus, this);
    this._signalManager.connect(global.settings, "changed::panel-edit-mode", this._onPanelEditModeChanged, this);
    this._signalManager.connect(this._settings, "changed::pinned-apps", this._updatePinnedApps, this);
    this._signalManager.connect(this._settings, "changed::show-windows-for-current-monitor", this._updateAllWindowsForMonitor, this);
    //this._signalManager.connect(this._settings, "changed::group-windows", this._onGroupingChanged, this);
  }

  onOrientationChanged(orientation) {
    if (orientation == St.Side.TOP || orientation == St.Side.BOTTOM) {
      this.actor.set_vertical(false);
      this.actor.remove_style_class_name("vertical");
      this.actor.set_style("margin-bottom: 0px; padding-bottom: 0px; margin-top: 0px; padding-top: 0px;");
    } else {
      this.actor.set_vertical(true);
      this.actor.add_style_class_name("vertical");
      this.actor.set_style("margin-right: 0px; padding-right: 0px; padding-left: 0px; margin-left: 0px;");
    }
    for (let i = 0; i < this._appButtons.length; i++) {
      this._appButtons[i]._updateOrientation();
    }
  }

  _onPanelEditModeChanged () {
    let panelEditMode = global.settings.get_boolean("panel-edit-mode");
    if (panelEditMode) {
      this.actor.set_track_hover(true);
    } else {
      this.actor.set_hover(false);
      this.actor.set_track_hover(false);
    }

    for (let i = 0; i < this._appButtons.length; i++) {
      this._appButtons[i]._draggable.inihibit = panelEditMode;
    }
  }

  _onDragBegin() {
    let children = this.actor.get_children();
    for (let i = 0; i < children.length; i++) {
      let appButton = children[i]._delegate;
      if (appButton instanceof WindowListButton) {
        this.closeThumbnailMenu();
      }
    }
  }

  onPanelHeightChanged() {
    for (let i in this._appButtons) {
      this._appButtons[i].updateIcon();
    }
  }

  _addAppButton(app, prepend=true) {
    if (!app) {
      return undefined;
    }
    let groupingType = this._settings.getValue("group-windows");
    let btns = this._lookupAllAppButtonsForApp(app);
    let appButton = new WindowListButton(this, this._applet, app);
    // New appButton should behave like the existing buttons for the app
    if (btns && btns.length > 0) {
       appButton._grouped = btns[0]._grouped;
    } else if (groupingType === GroupType.Grouped) {
       appButton._grouped = GroupingType.ForcedOn;
    }
    this._appButtons.push(appButton);
    this.actor.add_actor(appButton.actor);
    appButton.updateIcon();
    if ((groupingType == GroupType.Pooled || groupingType == GroupType.Auto || prepend) && btns && btns.length > 0) {
       // Move the button to the top of the list of buttons for the app
       let children = this.actor.get_children();
       let actIdx;
       if (prepend) {
          actIdx = children.indexOf(btns[0].actor);
         this.actor.set_child_at_index(appButton.actor, actIdx);
       } else {
          actIdx = children.indexOf(btns[btns.length-1].actor)+1;
          this.actor.set_child_at_index(appButton.actor, actIdx);
          btns[btns.length-1]._updateLabel();
       }
    } else if (this._settings.getValue("trailing-pinned-behaviour")===true) {
       // Move the button before any trailing pinned buttons
       let children = this.actor.get_children();
       if (children.length > 1 ){
          let i = children.length-2;  // ignoring the last button which will be this new button
          let pooling = (groupingType == GroupType.Pooled || groupingType == GroupType.Auto);
          for ( let prevApp = undefined ; i >= 0 && (children[i]._delegate._pinned === true || (pooling && prevApp === children[i]._delegate._app)) ; i-- ) {
             prevApp = children[i]._delegate._app;
          }
          if (i != children.length-2){
             this.actor.move_child(appButton.actor, i+1);
          }
       }
    }
    //appButton.actor.show();
    appButton._updateLabel();
    return appButton;
  }

  _removeAppButton(appButton) {
    let app = appButton._app;
    let index = this._appButtons.indexOf(appButton);
    if (index >= 0) {
       this._appButtons.splice(index, 1);
       appButton.destroy();
    }
    if (app && appButton._shrukenLabel===false){
       // Do we have a new button in a pool that needs a label
       let captionType = this._settings.getValue("display-caption-for");
       if (captionType == DisplayCaption.One) {
          let allButtons = this._lookupAllAppButtonsForApp(app);
          if (allButtons.length >= 1) {
             allButtons[allButtons.length-1]._updateLabel();
          }
       }
    }
  }

  _lookupAppButtonForWindow(metaWindow) {
    let appButtons = this._appButtons.filter(function(appButton) {
      return appButton._windows.indexOf(metaWindow) >= 0;
    });
    return appButtons.length > 0 ? appButtons[0] : undefined;
  }

  _lookupAllAppButtonsForApp(app, startIndex) {
    let children = this.actor.get_children().slice(startIndex);
    let btns = children.map(x => x._delegate);
    return btns.filter(x => { return x instanceof WindowListButton && x._app && x._app.get_id() == app.get_id() });
  }

  _lookupAppButtonForApp(app, startIndex) {
    let appButtons = this._lookupAllAppButtonsForApp(app, startIndex);
    return appButtons.length > 0 ? appButtons[0] : undefined;
  }

  _windowAdded(metaWindow, skipSizeChk=false, prepend=false) {
    if (this._settings.getValue("show-windows-for-current-monitor") &&
        this._applet.panel.monitorIndex != metaWindow.get_monitor()) {
      return;
    }

    if (!Main.isInteresting(metaWindow)) {
      return;
    }

    if (this._lookupAppButtonForWindow(metaWindow)) {
      return;
    }

    if (metaWindow.get_workspace().index() != this._wsNum && !metaWindow.is_on_all_workspaces()) {
      return;
    }

    let app = this._windowTracker.get_window_app(metaWindow);
    if (!app) {
      app = this._windowTracker.get_app_from_pid(metaWindow.get_pid());
    }
    if (!app) {
      return false;
    }
    let appButton = this._lookupAppButtonForApp(app);
    let groupingType = this._settings.getValue("group-windows")
    if (!appButton || (groupingType != GroupType.Launcher && appButton._windows.length > 0 && appButton._grouped <= GroupingType.NotGrouped)) {
      appButton = this._addAppButton(app, prepend);
    }
    appButton.addWindow(metaWindow);
    //this._updateAppButtonVisibility();
    // Keep growing the maxSize as we see bigger window list widths
    if (this.actor.get_width() > this.maxSize) {
      let width = appButton._labelBox.get_width();
      if (width == 0) {
        // When animation is enabled the width of new windows will be 0 so we need to add the expected button width
        this.maxSize = this.actor.get_width() + (this._settings.getValue("label-width")*2);
      } else {
        this.maxSize = this.actor.get_width() + this._settings.getValue("label-width");
      }
    }
    if (skipSizeChk==false && groupingType == GroupType.Auto && this._appButtons.length > 0) {
       // Check if a button size is smaller then the configured size setting and then group apps if needed
       this._tryGroupingApps();
    }
    this._applet.assignHotKeysToNewWindow(appButton, this);
    return false;
  }

  _windowRemoved(metaWindow, removeBindings=true) {
     let appButton = this._lookupAppButtonForWindow(metaWindow);
     let btnToUpdateLabel = null;
     if (appButton) {
        if (this._settings.getValue("display-caption-for") === DisplayCaption.One) {
           let children = this.actor.get_children();
           let idx = children.indexOf(appButton.actor);
           if (idx > 0 && children[idx-1]._delegate._app === appButton._app) {
              // The about to be removed button is proceeded by a button for the same app, might need to restore it's label
              btnToUpdateLabel = children[idx-1]._delegate;
           }
        }
        appButton.removeWindow(metaWindow);
        if (btnToUpdateLabel){
           btnToUpdateLabel._updateLabel();
        }
        if (appButton._windows.length === 0 && (appButton._pinned===false || this._settings.getValue("display-pinned")===false)) {
           let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
           animatedRemoveAppButton(this, animTime, appButton);
        } else {
           // If pinned, look for other windows and move one to this pinned button
           if (appButton._pinned) {
              let btns = this._lookupAllAppButtonsForApp(appButton._app);
              if (btns.length > 1) {
                 let i = (btns[0] == appButton)?1:0;
                 let window = btns[i]._windows[0];
                 btns[i].removeWindow(window);
                 appButton.addWindow(window);
                 let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
                 animatedRemoveAppButton(this, animTime, btns[i]);
              } else if (appButton._windows.length === 0) {
                 this.menuManager.removeMenu(appButton.menu);
              }
           }
        }
        // Remove any hot key bindings.
        if (removeBindings) {
           let i = this._keyBindingsWindows.lastIndexOf(metaWindow);
           while (i!=-1) {
              this._keyBindingsWindows[i] = undefined;
              // Since we removed a window from a hotkey, maybe there is another window that can get this hot key?
              this._applet.assignHotKeysToExistingWindows(this._applet._keyBindings[i].description, i);
              i = this._keyBindingsWindows.lastIndexOf(metaWindow);
           }
        }
        // Now that we removed a window, see if there is enough space to expand automatically grouped windows
        this._tryExpandingAppGroups();
     }
  }

  _updateAllWindowsForMonitor() {
    let ws = global.screen.get_workspace_by_index(this._wsNum);
    let windows = ws.list_windows();
    let setting = this._settings.getValue("show-windows-for-current-monitor");

    for (let i = 0; i < windows.length; i++) {
      let metaWindow = windows[i];
      if (!setting) {
        this._windowAdded(metaWindow);
      } else {
        if (metaWindow.get_monitor() != this._applet.panel.monitorIndex) {
          this._windowRemoved(metaWindow);
        } else {
          this._windowAdded(metaWindow);
        }
      }
    }
  }

  _lookupApp(appId) {
    let app = null;
    if (appId) {
      app = this._appSys.lookup_app(appId);
    }
    return app;
  }

  _updatePinnedApps() {
    // find new pinned applications
    if (this._settings.getValue("display-pinned")) {
      let pinnedApps = this._settings.getValue("pinned-apps")[this._wsNum];
      for (let i = 0; i < pinnedApps.length; i++) {
        let pinnedAppId = pinnedApps[i];
        let app = this._lookupApp(pinnedAppId);
        let appButton;
        if (!app) {
          continue;
        }
        let idx;
        let btns = this._lookupAllAppButtonsForApp(app);
        // Find any existing pinned, only one app button should be pinned for a given app
        for (idx=btns.length-1 ; idx > 0 ; idx--) {
           if (btns[idx]._pinned)
              break;
        }
        appButton = btns[idx];
        if (!appButton) {
          appButton = this._addAppButton(app);
          let children = this.actor.get_children();
          let targetIdx = children.length - 1;
          for (let j = children.length - 2; j >= 0; j--) {
            let btn = children[j]._delegate;
            let btnPinIdx = btn.getPinnedIndex()
            if (btnPinIdx >= 0 && btnPinIdx > i) {
              targetIdx = j;
            }
          }
          if (targetIdx >= 0) {
            this.actor.move_child(appButton.actor, targetIdx);
          }
        }
        appButton._pinned = true;
        appButton._minLabelSize = -1; // Must re-calculate
        appButton._updateLabel()
      }
    } else {
       // remove pinned buttons because pinning has been disabled
       let btns = this._appButtons.slice();
       for (let i = btns.length - 1; i >= 0; i--) {
         let appButton = btns[i];
         if (appButton._pinned && appButton._windows.length == 0) {
           let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
           animatedRemoveAppButton(this, animTime, appButton);
         }
       }
    }

    // Remove buttons that are no longer pinned
    for (let i = this._appButtons.length - 1; i >= 0; i--) {
      let appButton = this._appButtons[i];
      if ((appButton._app && appButton.getPinnedIndex() < 0) && appButton._windows.length == 0) {
        let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
        animatedRemoveAppButton(this, animTime, appButton);
      }
    }
  }

  _onDisplayPinnedChanged() {
    let setting = this._settings.getValue("display-pinned");
    if (setting) {
      this._updatePinnedApps();
    } else {
      for (let i = this._appButtons.length - 1; i >= 0; i--) {
        let appButton = this._appButtons[i];
        if (appButton._windows.length == 0) {
          let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
          animatedRemoveAppButton(this, animTime, appButton);
        }
      }
    }
  }

  _updatePinSettings() {
    let appButtons = this.actor.get_children().map(x => x._delegate);
    let newSetting = [];
    let pinnedBtns = appButtons.filter(x => { return (x._pinned && !x._app.get_id().startsWith("window:")) });
    for (let i = 0; i < pinnedBtns.length; i++) {
      newSetting.push(pinnedBtns[i]._app.get_id());
    }
    let pinSetting = this._settings.getValue("pinned-apps").slice();
    pinSetting[this._wsNum] = newSetting;
    this._settings.setValue("pinned-apps", pinSetting);
    // Inform other windowlist that our pinned list changed in case they want to remove windowlist buttons
    this._applet.updateOtherWindowLists()
  }

  pinAppId(appId, actorPos) {
    let app = this._lookupApp(appId);
    if (!app) {
      return false;
    }
    let appButton = this._lookupAppButtonForApp(app);
    if (!appButton) {
      appButton = this._addAppButton(app);
      let actIdx = this.actor.get_children().indexOf(appButton.actor);
      if (actorPos !== undefined && actorPos - actIdx > 0) {
        actorPos--;
      }
    }
    if (actorPos !== undefined) {
      this.actor.move_child(appButton.actor, actorPos);
    }
    this.pinAppButton(appButton);
    return true;
  }

  unpinAppId(appId) {
    let app = this._lookupApp(appId);
    if (!app) {
      return false;
    }
    let appButtons = this._lookupAllAppButtonsForApp(app);
    for (let i = 0; i < appButtons.length; i++) {
      let appButton = appButtons[i];
      if (appButton._pinned) {
        this.unpinAppButton(appButton);
        return true;
      }
    }
    return false;
  }

  pinAppButton(appButton) {
    let app = appButton._app;
    let appId = app.get_id();

    let appButtons = this._lookupAllAppButtonsForApp(app);
    for (let i = 0; i < appButtons.length; i++) {
      appButtons[i]._pinned = false;
      appButtons[i]._minLabelSize = -1;  // Must re-calculate
    }

    appButton._pinned = true;
    appButton._updateVisibility()
    this._updatePinSettings();
  }

  unpinAppButton(appButton) {
    appButton._pinned = false;
    appButton._minLabelSize = -1 // Must re-calculate
    appButton.updateView();
    if (appButton._windows.length == 0) {
      let animTime = this._settings.getValue("label-animation") ? this._settings.getValue("label-animation-time") : 0;
      animatedRemoveAppButton(this, animTime, appButton);
    }
    this._updatePinSettings();
  }

  _onGroupingChanged() {
     let setting = this._settings.getValue("group-windows");
     switch(setting) {
        case GroupType.Grouped:
           this._groupAllApps(GroupingType.ForcedOn);
           break;
        case GroupType.Pooled:
           this._ungroupAllApps(GroupingType.ForcedOff);
           this._poolAllApps();
           break;
        case GroupType.Auto:
           this._ungroupAllApps(GroupingType.NotGrouped);
           this._poolAllApps();
           break;
        case GroupType.Off:
           this._ungroupAllApps(GroupingType.ForcedOff);
           break;
        case GroupType.Launcher:
           break;
     }
     this._updateAppButtonVisibility()

  }

  _poolAllApps() {
     let appButtons = this._appButtons.slice();
     let apps = [];
     for (let i = 0; i < appButtons.length; i++) {
        if (appButtons[i]._app && apps.indexOf(appButtons[i]._app) == -1) {
           let allButtons = this._lookupAllAppButtonsForApp(appButtons[i]._app);
           if (allButtons.length > 1){
              apps.push(appButtons[i]._app);
              let windows = [];
              allButtons.forEach((element) => {windows.push(element._windows[0]); this._windowRemoved(element._windows[0]);} );
              windows.forEach((element) => {this._windowAdded(element);} );
           }
        }
     }
  }

  _groupAllApps(grpType) {
     let appButtons = this._appButtons.slice();
     for (let i = 0; i < appButtons.length; i++) {
        if (appButtons[i]._app) {
           let allButtons = this._lookupAllAppButtonsForApp(appButtons[i]._app);
           if (allButtons.length > 1){
              this._groupOneApp(allButtons, grpType);
           }
        }
     }
  }

  _ungroupAllApps(grpType) {
     let appButtons = this._appButtons.slice();
     for (let i = 0; i < appButtons.length; i++) {
        if (appButtons[i]._windows.length > 1) {
           this._ungroupOneApp(appButtons[i], grpType);
        }
     }
  }

  _updateAppButtonVisibility() {
    for (let i = 0; i < this._appButtons.length; i++) {
      let appButton = this._appButtons[i];
      appButton.updateView();
    }
    this.actor.queue_relayout();
  }

  _updateFocus() {
    // Get current window with focus
    let window = global.display.get_focus_window();
    if (window) {
       let newFocus = this._lookupAppButtonForWindow(window);
       if (!newFocus) {
          window.foreach_ancestor(
             Lang.bind(this, function(ancestor) {
                newFocus = this._lookupAppButtonForWindow(ancestor);
                if (newFocus) {
                   return(false);
                }
                return(true);
             } )
          );
       }
       if (newFocus) {
          if (this._currentFocus && newFocus != this._currentFocus) {
             this._currentFocus._updateFocus();
             let pinnedSetting = this._settings.getValue("display-caption-for-pined");
             let capSetting = this._settings.getValue("display-caption-for");
             if (pinnedSetting == PinnedLabel.Focused && capSetting === DisplayCaption.One) {
                // Do we need to clear the label from the pooled window group
                let children = this.actor.get_children();
                let idx=children.length-1;
                for ( ; idx >= 0 && children[idx]._delegate._app != this._currentFocus._app ; idx--);
                if (idx >= 0 && children[idx]._delegate != this._currentFocus) {
                   children[idx]._delegate._updateLabel()
                }
             }
             // Since we don't have a app specific data structure, we need to unset all app button appLastFocus values
             let btns = this._lookupAllAppButtonsForApp(newFocus._app);
             for (let i=0 ; i<btns.length ; i++) {
                btns[i].appLastFocus = false;
             }
             newFocus.appLastFocus = true;
          }
          newFocus._updateFocus();
          this._currentFocus = newFocus;
       }
    }
  }

  // Handle a drag movement over the windowlist buttons
  handleDragOver(source, actor, x, y, time) {
    if (!(source.isDraggableApp || (source instanceof DND.LauncherDraggable))) {
      return DND.DragMotionResult.CONTINUE;
    }

    if (x <= 0 || x > this.actor.width || y <= 0 || y > this.actor.height) {
      this._clearDragPlaceholder();
      return DND.DragMotionResult.CONTINUE;
    }

    let children = this.actor.get_children();
    let pos = children.length;

    if (this._applet.orientation == St.Side.TOP || this._applet.orientation == St.Side.BOTTOM) {
      while (--pos && (x < children[pos].get_allocation_box().x1 || children[pos].is_visible() == false));
    } else {
      while (--pos && (y < children[pos].get_allocation_box().y1 || children[pos].is_visible() == false));
    }
    let dragPlaceholderPos = this._dragPlaceholderPos
    // If the pointer is over the placeholder then we don't need to move anything
    if (pos != dragPlaceholderPos) {
      let movePlaceHolder = true;
      let groupingType = this._settings.getValue("group-windows");
      let location;
      if (this._applet.orientation == St.Side.TOP || this._applet.orientation == St.Side.BOTTOM) {
        location = x;
      } else {
        location = y;
      }
      // Do we need to keep application buttons together while dragging? 
      let prevDragLocation = this.prevDragLocation;
      if (prevDragLocation && groupingType == GroupType.Pooled || groupingType == GroupType.Auto) {
        let btns = this._lookupAllAppButtonsForApp(children[pos]._delegate._app);
        if (btns && btns.length > 1 && btns.indexOf(source)==-1) {
          if (dragPlaceholderPos < pos && prevDragLocation < location) {
            while (pos<children.length-1 && btns.includes(children[pos+1]._delegate)) { pos++; }
          } else if (dragPlaceholderPos > pos && prevDragLocation > location) {
            while (pos>0 && btns.includes(children[pos-1]._delegate)) { pos--; }
          } else {
            movePlaceHolder = false;
          }
        }
      }
      // Don't move PlaceHolder if the pointer is moving towards the PlaceHolder
      if (prevDragLocation && movePlaceHolder) {
         if ((dragPlaceholderPos < pos && prevDragLocation >= location) || 
             (dragPlaceholderPos > pos && prevDragLocation <= location)) 
         {
            movePlaceHolder = false;
         }
      }
      this.prevDragLocation = location;
      if (movePlaceHolder == true) {
        this._dragPlaceholderPos = pos;
        // If we don't yet have a PlaceHolder, create one, otherwise move it
        if (this._dragPlaceholder == undefined) {
          this._dragPlaceholder = new DND.GenericDragPlaceholderItem();
          this._dragPlaceholder.child.set_width(source.actor.width);
          this._dragPlaceholder.child.set_height(source.actor.height);
          this.actor.insert_child_at_index(this._dragPlaceholder.actor, pos);
          source.actor.hide();
        } else {
          this.actor.set_child_at_index(this._dragPlaceholder.actor, pos);
        }
      }
    }

    if (source instanceof WindowListButton && this.actor.contains(source.actor)) {
      return DND.DragMotionResult.MOVE_DROP;
    } else {
      return DND.DragMotionResult.COPY_DROP;
    }
  }

  handleDragOut() {
    this._clearDragPlaceholder();
  }

  acceptDrop(source, actor, x, y, time) {
    if (this._dragPlaceholderPos == undefined) {
      return false;
    }
    if (source.isDraggableApp || source instanceof DND.LauncherDraggable) {
      let actorPos = this._dragPlaceholderPos;
      if (source instanceof WindowListButton && this.actor.contains(source.actor)) {
        let btns = source._workspace._lookupAllAppButtonsForApp(source._app);
        let groupingType = this._settings.getValue("group-windows");
        let children = this.actor.get_children();
        // Check if we have to move an entire application pool or just the one button??
        if (btns.length > 1 && (groupingType == GroupType.Pooled || groupingType == GroupType.Auto) && (actorPos < children.indexOf(btns[0].actor)-1 || actorPos > children.indexOf(btns[btns.length-1].actor)+1)) {
           if (actorPos < children.indexOf(btns[0].actor)-1) {
              for (let idx=btns.length-1 ; idx >= 0 ; idx--) {
                 this.actor.set_child_at_index(btns[idx].actor, actorPos);
              }
           } else {
              for (let idx=0 ; idx < btns.length ; idx++) {
                 this.actor.set_child_at_index(btns[idx].actor, actorPos);
              }
           }
           this._clearDragPlaceholder();
        } else {
           this.actor.set_child_at_index(source.actor, actorPos);
           this._clearDragPlaceholder();
           if (btns.length > 1 && (groupingType == GroupType.Pooled || groupingType == GroupType.Auto)) {
              let btns = source._workspace._lookupAllAppButtonsForApp(source._app);
              btns[btns.length-1]._updateLabel(); // The trailing button might need it's label restored
              if (source === btns[btns.length-1]) {
                 btns[btns.length-2]._updateLabel(); // If the dropped button is now the last one in the pool, then update the label of the previous button
              }
              if (btns[btns.length-1]._pinned === false) {
                 for(let i=0 ; i<btns.length ; i++) {
                    if (btns[i]._pinned) {
                       this.pinAppButton(btns[btns.length-1]); // Clear existing pin and set the last button of the pool as pinned
                       break;
                    }
                 }
              }
           }
        }
        if (this._settings.getValue("display-caption-for") === DisplayCaption.One) {
           source._updateLabel(); // The moved button might need it's label restored
           if (groupingType != GroupType.Pooled && groupingType != GroupType.Auto) {
              let numChildern = this.actor.get_n_children();
              // Since a label can appear/disappear based only on the adjacent buttons, we have to look at the all buttons
              // and update the label if any two adjacent buttons have the same application
              for (let i=0 ; i < numChildern ; i++ ) {
                 let child = this.actor.get_child_at_index(i)._delegate;
                 if ((i>0 && child._app === this.actor.get_child_at_index(i-1)._delegate._app) || (i<numChildern-1 && child._app === this.actor.get_child_at_index(i+1)._delegate._app)) {
                    child._updateLabel();
                 }
              }
           }
        }
        if (source._pinned) {
          this.pinAppButton(source);
        }
      } else {
        let appId;
        if (source.isDraggableApp) {
          appId = source.get_app_id();
        } else {
          appId = source.getId();
        }
        this._clearDragPlaceholder();
        let result = this.pinAppId(appId, actorPos);
        if (!result) {
          return false;
        }
      }
    }
    this.prevDragLocation = undefined;
    return true;
  }

  _clearDragPlaceholder() {
    if (this._dragPlaceholder) {
      this._dragPlaceholder.actor.destroy();
      this._dragPlaceholder = undefined;
      this._dragPlaceholderPos = undefined;
    }
  }

  destroy() {
    this._signalManager.disconnectAllSignals();

    let pinSetting = this._settings.getValue("pinned-apps").slice();
    pinSetting.splice(this._wsNum, 1);
    this._settings.setValue("pinned-apps", pinSetting);

    for (let i = this._appButtons.length - 1; i >= 0; i--) {
      this._appButtons[i].destroy();
    }
    this._appButtons = null;
    this.actor.destroy();
  }

  // Find the application with the most Buttons
  // returns an array of buttons or undefined if there are no applications with more then one button
  getAppWithMostButtons() {
    let mostBtns = undefined;
    for (let idx=this._appButtons.length-1 ; idx >= 0 ; idx--) {
      let btns = this._lookupAllAppButtonsForApp(this._appButtons[idx]._app);
      if (btns.length > 1 && btns[0]._grouped != GroupingType.ForcedOff && (mostBtns == undefined || btns.length > mostBtns.length)) {
        mostBtns = btns;
      }
    }
    return mostBtns;
  }

  // Look at all the grouped AppButtons, find the one with the highest number of windows that
  // can be expanded without causing the button size to shrink below the preferred size.
  // Repeat this process while available space remains or no ungroupable buttons are found.
  _tryExpandingAppGroups() {
     if (this._status != 0) {
        return;
     }
     let settingsWidth = this._settings.getValue("label-width");
     let captionType = this._settings.getValue("display-caption-for");
     let width = 12; // 12 is the width of a button without a caption (just the space for the minimized flag char) 
     if (captionType != DisplayCaption.One)
        width = settingsWidth;
     let btnToUngroup;
     let willConsume ;
     let spaceAvailable = this.maxSize - this.actor.get_width();
     if (spaceAvailable < 0) { 
        this.maxSize = this.actor.get_width()
        spaceAvailable = 0;
     }
     // Restore indicator characters
     if (spaceAvailable>0 && this.autoIndicatorsOff) {
        this.autoIndicatorsOff = false;
        for (let i=0 ; i<this._appButtons.length ; i++) {
           if (this._appButtons[i]._pinned || this._appButtons[i]._currentWindow.minimized) {
              this._appButtons[i]._minLabelSize = -1; // Re-calculate
              this._appButtons[i]._updateLabel();
           }
        }
     }
     this._status = 1;
     while (spaceAvailable>0) {
        btnToUngroup = null;
        willConsume = 0;
        for (let i=this._appButtons.length-1 ; i >= 0 ; i--) {
           if (this._appButtons[i]._grouped === GroupingType.Auto) {
              // There is already one full width app (the group) so the expansion size will
              // be the expected appButton size * the number of windows-1
              let consumes = (this._appButtons[i]._windows.length-1)*width;
              if (consumes > willConsume && consumes <= spaceAvailable) {
                 btnToUngroup = this._appButtons[i];
                 willConsume = consumes;
              }
           }
        }
        if (btnToUngroup!=null) {
           this._ungroupOneApp(btnToUngroup);
           spaceAvailable -= willConsume;
        } else {
           break; // Nothing we can ungroup, we're done!
        }
     }
     this._status = 0;
  }

  // Look for applications with more then one button so that we can group them to make more space on the windowlist
  // and avoid having the captions shrink.
  _tryGroupingApps() {
     if (this._status != 0) {
        return;
     }
     if (this._areButtonsShrunk()==true) {
        if (this._applet.indicators == IndicatorType.Auto) {
           this.autoIndicatorsOff = true;   // Remove the indicator characters
           for (let i=0 ; i<this._appButtons.length ; i++) {
              if (this._appButtons[i]._pinned || (this._appButtons[i]._currentWindow && this._appButtons[i]._currentWindow.minimized)) {
                 this._appButtons[i]._minLabelSize = -1; // Re-calculate
                 this._appButtons[i]._updateLabel();
              }
           }
        }
        // Shrink all the applications into single group buttons
        this._status = 1;
        do {
           let btns = this.getAppWithMostButtons();
           if (btns != undefined) {
              this._groupOneApp(btns);
           } else {
              break;
           }
        } while (this._areButtonsShrunk()==true);
        this._status = 0;
     }
  }

  // Group the passed in list of buttons
  // It is assumed that the 'btns' list will all be for the same application
  _groupOneApp(btns, type=GroupingType.Auto) {
    let windows = [];
    for (let i=0 ; i<btns.length-1 ; i++) {
       windows.push(btns[i]._windows[0]);
       this._windowRemoved(btns[i]._windows[0], false); // 'false' means the keyBindings will not be cleared!
    }
    btns[btns.length-1]._grouped = type;
    for (let i=0 ; i < windows.length ; i++) {
       this._windowAdded(windows[i], true);
    }
    // Setup the windows array so that the window list is the same order as it was before the grouping occurred!
    let x = btns[btns.length-1]._windows.shift();
    btns[btns.length-1]._windows.push(x);
    this._updateFocus();
  }

  // Ungroup the windows in the passed in buttons, set the button so it's not grouping, add windows back
  // which creates new appButtons. Assumes the passed in button is already grouped
  _ungroupOneApp(button, type=GroupingType.NotGrouped) {
     let windows = button._windows;
     if (windows.length < 2) return;
     let appLastFocus = button._currentWindow;
     let window = undefined;
     button._grouped = type;
     // remove all but one window from this appButton
     for (let i=windows.length-2 ; i>=0 ; i--) {
        window = windows[i];
        button.removeWindow(window);
        this._windowAdded(window, false, true); // add window, don't skip size chk, prepend to existing app buttons
     }
     button.appLastFocus = false;
     let lastFocusBtn = button._workspace._lookupAppButtonForWindow(appLastFocus);
     lastFocusBtn.appLastFocus = true;
     button._updateLabel();
     this._updateFocus();
  }

  // Determine if the buttons are being shrunk below the preferred size
  _areButtonsShrunk(){
     if (this._appButtons.length < 1) {
        return false;
     }
     // Allow the windowlist buttons to shrink by 4% before we report as shrunk
     let preferredWidth = this._settings.getValue("label-width")*0.96;
     let width;
     for (let i=0 ; i<this._appButtons.length ; i++) {
        width = this._appButtons[i]._labelBox.get_width();
        // width of 0 just means that animation is enabled. The width will grow to normal size.
        if (width > 0 && this._appButtons[i]._shrukenLabel===false && width < preferredWidth) {
           return true;
        }
     }
     return false;
  }

  closeThumbnailMenu(){
     if (this.currentMenu) {
        this.currentMenu._appButton.closeThumbnailMenu();
     }
  }

  removeThumbnailMenuDelay(){
     if (this._delayId) {
        let doIt = GLib.MainContext.default().find_source_by_id(this._delayId);
        if (doIt) {
           Mainloop.source_remove(this._delayId);
        }
        this._delayId = null;
     }
  }
}

// The windowlist manager, one instance for each windowlist
class WindowList extends Applet.Applet {

  constructor(orientation, panelHeight, instanceId) {
    super(orientation, panelHeight, instanceId);
    this.setAllowedLayout(Applet.AllowedLayout.BOTH);

    this.actor.set_hover(false);
    this.actor.set_track_hover(false);
    this.orientation = orientation;

    //this._settings = new WindowListSettings(instanceId);
    this._settings = new Settings.AppletSettings(this, UUID, instanceId);
    this._signalManager = new SignalManager.SignalManager(null);

    this._workspaces = [];
    this._keyBindings = [];
    this._hiddenApps = null; // List of applications that should not be visible buttons
    this.indicators = 3;
    this.instanceId = instanceId;
    this.on_orientation_changed(orientation);
  }

  _updateKeybinding() {
     let oldBindings = this._keyBindings;
     let keyBindings = this._settings.getValue("hotkey-bindings");
     let i=0;
     for ( ; i < keyBindings.length ; i++) {
        // Is the new keyBinding enabled and different to the old binding
        if (keyBindings[i].enabled && (oldBindings.length <= i || oldBindings[i].enabled === false || keyBindings[i].keyCombo != oldBindings[i].keyCombo)) {
           let idx = i;
           // Register the hotkey
           Main.keybindingManager.addHotKey("hotkey-" + i + this.instanceId, keyBindings[i].keyCombo, Lang.bind(this, function() {
                 // Hotkey handler function!!!
                 //
                 //log( "Hotkey pressed for "+this._keyBindings[idx].description );
                 let minimize = this._settings.getValue("hotkey-minimize");
                 let workspace = this.getCurrentWorkSpace();
                 workspace.closeThumbnailMenu();
                 if (workspace._keyBindingsWindows.length > idx && workspace._keyBindingsWindows[idx] != undefined) {
                    if (this._keyBindings[idx].cycle === true){
                       let window = workspace._keyBindingsWindows[idx];
                       let appButton = workspace._lookupAppButtonForWindow(window);
                       if (appButton && appButton._windows.length > 1) {
                          // All app windows are grouped under one appButton
                          if (hasFocus(appButton._currentWindow)===true) {
                             if (appButton._nextWindow===null || appButton._nextWindow===appButton._currentWindow) {
                                appButton._updateCurrentWindow(); // This will set appButton.sortedWindows
                                appButton._nextWindow = appButton.sortedWindows[1];
                             }
                             let idx = appButton.sortedWindows.indexOf(appButton._nextWindow);
                             Main.activateWindow(appButton._nextWindow);
                             if (idx === appButton.sortedWindows.length-1) {
                                appButton._nextWindow = appButton.sortedWindows[0];
                             } else {
                                appButton._nextWindow = appButton.sortedWindows[idx+1];
                             }
                          } else {
                             appButton._updateCurrentWindow(); // This will set appButton.sortedWindows
                             appButton._nextWindow = appButton.sortedWindows[1];
                             Main.activateWindow(appButton._currentWindow);
                          }
                          return;
                       } else if(appButton) {
                          // App windows are not grouped under one button
                          let focusWindow = global.display.get_focus_window();
                          if (workspace.cycleBtns !== undefined && appButton._app === workspace.cycleBtns[workspace.cycleIdx]._app &&
                              workspace.cycleBtns[workspace.cycleIdx]._windows[0] === focusWindow)
                          {
                             workspace.cycleIdx++;
                             if (workspace.cycleIdx >= workspace.cycleBtns.length)
                                workspace.cycleIdx = 0;
                             Main.activateWindow(workspace.cycleBtns[workspace.cycleIdx]._windows[0]);
                             return;
                          } else {
                             let btns = workspace._lookupAllAppButtonsForApp(appButton._app);
                             if (btns.length > 1) {
                                // Sort the app buttons array by most recently focused
                                btns = btns.sort(function(a, b) {
                                   return b._windows[0].user_time - a._windows[0].user_time;
                                });
                                workspace.cycleBtns = btns;
                                if (btns[0]._windows[0] === focusWindow) {
                                   workspace.cycleIdx = 1
                                } else {
                                   workspace.cycleIdx = 0;
                                }
                                Main.activateWindow(btns[workspace.cycleIdx]._windows[0]);
                                return;
                             }
                          }
                       }
                    }
                    // cycling is disabled or app does not have the focus, so restore or minimize the selected window
                    if (minimize && hasFocus(workspace._keyBindingsWindows[idx])){
                       workspace._keyBindingsWindows[idx].minimize();
                    } else {
                       Main.activateWindow(workspace._keyBindingsWindows[idx]);
                    }
                 } else if(this._keyBindings[idx].description && this._settings.getValue("hotkey-new")) {
                    // The window is not bound. Start a new process if there is a pinned button matching the Description
                    for (let i=0 ; i < workspace._appButtons.length ; i++) {
                       if (workspace._appButtons[i]._pinned && workspace._appButtons[i]._app.get_name() == this._keyBindings[idx].description) {
                          workspace._appButtons[i]._startApp();
                          return;
                       }
                    }
                    // Try to find a app if the description is a .desktop file name
                    let app = workspace._lookupApp(this._keyBindings[idx].description);
                    if (app) {
                       app.open_new_window(-1);
                    }
                 }
              }));

        } else if(keyBindings[i].enabled === false && oldBindings.length > i) {
           // deregister the previously registered hotkey
           Main.keybindingManager.removeHotKey("hotkey-" + i + this.instanceId);
        }
        // If the key is enabled, set the keyBindingWindows for each workspace to the windows that match the description
        if (keyBindings[i].enabled === true) {
           this.assignHotKeysToExistingWindows(keyBindings[i].description, i);
        }
     }
     if (i < oldBindings.length) {
        // deregister the all the hotkeys that have been removed
        while (i < oldBindings.length) {
           Main.keybindingManager.removeHotKey("hotkey-" + i + this.instanceId);
           i++;
        }
     }
     this._keyBindings = keyBindings;
     for (let wsIdx=0 ; wsIdx<this._workspaces.length ; wsIdx++) {
        let ws = this._workspaces[wsIdx];
        for (let btnIdx=0 ; btnIdx < ws._appButtons.length ; btnIdx++) {
           let btn = ws._appButtons[btnIdx];
           if (btn.closing!=true)
              btn._updateTooltip();
        }
     }
  }

  _updateThumbnailWindowSize(){
     let size = this._settings.getValue("number-of-unshrunk-previews");
     for (let wsIdx=0 ; wsIdx<this._workspaces.length ; wsIdx++) {
        let ws = this._workspaces[wsIdx];
        for (let btnIdx=0 ; btnIdx < ws._appButtons.length ; btnIdx++) {
           let btn = ws._appButtons[btnIdx];
           btn.menu.numThumbs = size;
        }
     }
  }

  _updateIndicators() {
     if (this._settings.getValue("group-windows")===GroupType.Launcher)
        this.indicators = 0;
     else
        this.indicators = this._settings.getValue("display-indicators");
     for (let wsIdx=0 ; wsIdx<this._workspaces.length ; wsIdx++) {
        let ws = this._workspaces[wsIdx];
        for (let btnIdx=0 ; btnIdx < ws._appButtons.length ; btnIdx++) {
           let btn = ws._appButtons[btnIdx];
           if (btn._pinned || btn._shrukenLabel || (btn._windows.length > 0 && btn._windows[0].minimized)) {
              btn._minLabelSize = -1;
              btn._updateLabel();
           }
        }
     }
  }

  assignHotKeysToExistingWindows(appName, keyBindingIdx) {
     let workspace;
     for ( let wsIdx=0 ; wsIdx < this._workspaces.length ; wsIdx++) {
        workspace = this._workspaces[wsIdx];
        for ( let btnIdx=0 ; btnIdx < workspace._appButtons.length ; btnIdx++) {
           let btn = workspace._appButtons[btnIdx];
           if (btn._windows.length > 0 && (btn._app.get_name() == appName || btn._app.get_id() == appName)) {
              workspace._keyBindingsWindows[keyBindingIdx] = btn._windows[0];
           }
        }
     }
  }

  assignHotKeysToNewWindow(appButton, workspace) {
     if (appButton._windows.length != 1 ) {
        return;
     }
     let keyBindings = this._settings.getValue("hotkey-bindings");
     if( keyBindings && keyBindings.length > 0) {
        for( let i=0 ; i<keyBindings.length ; i++ ) {
           if (workspace._keyBindingsWindows[i] === undefined && (keyBindings[i].description == appButton._app.get_name() || keyBindings[i].description == appButton._app.get_id())) {
              workspace._keyBindingsWindows[i] = appButton._windows[0];
           }
        }
     }
  }

  _onDragBegin() {
    super._onDragBegin();
    let children = this.actor.get_children();
    for (let i = 0; i < children.length; i++) {
      let appButton = children[i]._delegate;
      if (appButton instanceof Workspace) {
        appButton._onDragBegin();
      }
    }
  }

  _onButtonReleaseEvent (actor, event) {
    // override applet's default context menu toggling
  }

  _onButtonPressEvent() {
    // override applet's default context menu toggling
  }

  on_applet_added_to_panel() {
    this._updateMonitor();
    let nWorkspaces = global.screen.get_n_workspaces();
    if (this._settings.getValue("group-windows")===GroupType.Launcher)
       this.indicators = 0;
    else
      this.indicators = this._settings.getValue("display-indicators");
    // upgrade pinned-apps
    let pinSetting = this._settings.getValue("pinned-apps");
    let newSetting = [];
    let changed = false;
    if (pinSetting.length > 0 && pinSetting[0] instanceof Array) {
      if (pinSetting.length > nWorkspaces) {
        newSetting = pinSetting.slice(0, nWorkspaces);
        changed = true;
      }
    } else {
      let nWorkspaces = global.screen.get_n_workspaces();
      for (let i = 0; i < nWorkspaces; i++) {
        newSetting.push(pinSetting.slice());
      }
      changed = true;
    }

    if (changed) {
      this._settings.setValue("pinned-apps", newSetting);
    }
    this._updateKeybinding();

    for (let i = 0; i < nWorkspaces; i++) {
      this._onWorkspaceAdded(global.screen, i);
    }

    this.checkForLauncherApplications(); // Check other windowlists for pinned items to be hidden
    this.updateOtherWindowLists();       // Force other windowlists to query for pinned items on this windowlist

    this._signalManager.connect(global.window_manager, "switch-workspace", this._updateCurrentWorkspace, this);
    this._signalManager.connect(global.screen, "workspace-added", this._onWorkspaceAdded, this);
    this._signalManager.connect(global.screen, "workspace-removed", this._onWorkspaceRemoved, this);
    this._signalManager.connect(global.screen, "window-added", this._windowAdded, this);
    this._signalManager.connect(global.screen, "window-removed", this._windowRemoved, this);
    this._signalManager.connect(global.screen, "window-monitor-changed", this.windowMonitorChanged, this);
    this._signalManager.connect(global.display, "notify::focus-window", this._onFocusChanged, this);
    this._signalManager.connect(Main.layoutManager, "monitors-changed", this._updateMonitor, this);
    this._signalManager.connect(this._settings, "changed::hotkey-bindings", this._updateKeybinding, this);
    this._signalManager.connect(this._settings, "changed::display-indicators", this._updateIndicators, this);
    this._signalManager.connect(this._settings, "changed::number-of-unshrunk-previews", this._updateThumbnailWindowSize, this);
    this._signalManager.connect(this._settings, "changed::hide-panel-apps", this._updateCurrentWorkspace, this);
    this._signalManager.connect(this._settings, "changed::group-windows", this._onGroupingChanged, this);
    this._signalManager.connect(this._settings, "settings-changed", this._onSettingsChanged, this);

    if (this._settings.getValue("runWizard")===1) {
       let command = GLib.get_home_dir() + "/.local/share/cinnamon/applets/" + this._uuid + "/setupWizard " + this._uuid + " " + this.instance_id;
       log( "Spawning: " + command );
       Util.spawnCommandLineAsync(command);
    }
  }

  _onSettingsChanged() {
     // Since the "setting-changed" event fires multiple times we use a timer to backup after some time as past
     if (this._backupDelayId)
        Mainloop.source_remove(this._backupDelayId);
     this._backupDelayId = Mainloop.timeout_add(60000, Lang.bind(this, this._backupConfig));
  }

  _backupConfig() {
     this._backupDelayId = null;
     let backupFileName = this._settings.getValue("backup-file-name");
     if (backupFileName && backupFileName!="") {
        //log( "Backing up config..." );
        let configFile = GLib.get_user_config_dir() + "/cinnamon/spices/" + this._uuid + "/" + this.instanceId + ".json";
        let file = Gio.File.new_for_path(configFile);
        if (!file.query_exists(null)) {
           configFile = GLib.get_home_dir() + "/.cinnamon/configs/" + this._uuid + "/" + this.instanceId + ".json";
           file = Gio.File.new_for_path(configFile);
        }
        if (file) {
           let destPath = GLib.get_user_config_dir() + "/cinnamon/spices/" + this._uuid + "/backup/";
           destPath = Gio.File.new_for_path(destPath);
           if (!destPath.query_exists(null)) {
              destPath.make_directory_with_parents(null);
           }
           destPath = GLib.get_user_config_dir() + "/cinnamon/spices/" + this._uuid + "/backup/" + backupFileName + ".json";
           destPath = Gio.File.new_for_path(destPath);
           let ret = file.copy(destPath, Gio.FileCopyFlags.OVERWRITE, null, null);
           //log( `Copy was successful: ${ret}` );
        }
     }
  }

  _onGroupingChanged() {
    this._updateIndicators();
    for (let i = 0; i < this._workspaces.length; i++) {
      this._workspaces[i]._onGroupingChanged();
    }
  }

  _onFocusChanged() {
     let window = global.display.get_focus_window();
     let currentWs = global.screen.get_active_workspace_index();
     //log( `Global, focus changed to ${window.get_title()} for ws ${currentWs}` );
     this._workspaces[currentWs]._updateFocus();
  }

  on_applet_removed_from_panel() {
    this._signalManager.disconnectAllSignals();
    for (let i=0 ; i<this._keyBindings.length ; i++) {
       Main.keybindingManager.removeHotKey("hotkey-" + i + this.instanceId);
    }
  }

  on_panel_height_changed() {
    for (let i = 0; i < this._workspaces.length; i++) {
      this._workspaces[i].onPanelHeightChanged();
    }
  }

  on_panel_icon_size_changed() {
    for (let i = 0; i < this._workspaces.length; i++) {
      this._workspaces[i].onPanelHeightChanged();
    }
  }

  on_orientation_changed(orientation) {
    this.orientation = orientation;
    if (orientation == St.Side.TOP || orientation == St.Side.BOTTOM) {
      this.actor.set_vertical(false);
      this.actor.remove_style_class_name("vertical");
      this.actor.set_style("margin-bottom: 0px; padding-bottom: 0px; margin-top: 0px; padding-top: 0px;");
    } else {
      this.actor.set_vertical(true);
      this.actor.add_style_class_name("vertical");
      this.actor.set_style("margin-right: 0px; padding-right: 0px; padding-left: 0px; margin-left: 0px;");
    }
    // TODO: update orientation for workspaces
    for (let i = 0; i < this._workspaces.length; i++) {
      this._workspaces[i].onOrientationChanged(orientation);
    }
  }

  _updateMonitor() {
    this.xrandrMonitors = getMonitors();
    this._monitor = Main.layoutManager.findMonitorForActor(this.actor);
  }

  _onWorkspaceAdded(screen, wsNum) {
    if (this._workspaces.length <= wsNum) {
      let workspace = new Workspace(this, wsNum);
      this._workspaces[wsNum] = workspace;
      let pinSettings = this._settings.getValue("pinned-apps");
      if (wsNum >= pinSettings.length) {
        pinSettings = pinSettings.slice();
        pinSettings.push([]);
        this._settings.setValue("pinned-apps", pinSettings);
      }
      this.actor.add_child(workspace.actor);
      this._updateCurrentWorkspace();
      workspace.onAddedToPanel();
    }
  }

  _onWorkspaceRemoved(screen, wsNum) {
    if (this._workspaces.length > wsNum) {
      let workspace = this._workspaces[wsNum];
      this._workspaces.splice(wsNum, 1);

      for (let i = 0; i < this._workspaces.length; i++) {
        this._workspaces[i]._wsNum = i;
      }

      workspace.destroy();
    }
  }

  _updateCurrentWorkspace() {
    let currentWs = global.screen.get_active_workspace_index();
    for (let i = 0; i < this._workspaces.length; i++) {
      let ws = this._workspaces[i];
      if (ws._wsNum == currentWs) {
        ws.actor.show();
        ws._updateAppButtonVisibility();
      } else {
        ws.actor.hide();
      }
    }
  }

  _windowAdded(screen, metaWindow, monitor) {
    if (this._settings.getValue("show-windows-for-current-monitor") &&
        monitor != this.panel.monitorIndex) {
      return;
    }
    for (let i = 0; i < this._workspaces.length; i++) {
      let workspace = this._workspaces[i];
      workspace._windowAdded(metaWindow);
    }
  }

  _windowRemoved(screen, metaWindow, monitor) {
    for (let i = 0; i < this._workspaces.length; i++) {
      let workspace = this._workspaces[i];
      workspace._windowRemoved(metaWindow);
    }
  }

  windowWorkspaceChanged(window, wsNumOld) {
    let stuck = window.is_on_all_workspaces();
    let wsWindow = window.get_workspace();
    if (wsWindow) { // I am not sure why it's ever the case the wsWindow is NULL???
       let wsNumNew = wsWindow.index();
       for (let i = 0; i < this._workspaces.length; i++) {
         let workspace = this._workspaces[i];
         let wsIdx = workspace._wsNum;
         if (stuck) {
           workspace._windowAdded(window);
         } else {
           if (wsNumNew == wsIdx) {
             workspace._windowAdded(window);
           } else {
             workspace._windowRemoved(window);
           }
         }
       }
    }
  }

  windowMonitorChanged(screen, window, monitor) {
    if (!this._settings.getValue("show-windows-for-current-monitor")) {
      return;
    }
    if (monitor == this.panel.monitorIndex) {
      this._windowAdded(screen, window, monitor);
    } else {
      this._windowRemoved(screen, window, monitor);
    }
  }

  getCurrentWorkSpace() {
    let currentWs = global.screen.get_active_workspace_index();
    for (let i = 0; i < this._workspaces.length; i++) {
      if (this._workspaces[i]._wsNum == currentWs) {
         return this._workspaces[i];
      }
    }
  }

  // May be called because this instance has locked the panel launcher role,
  // or it may be called from another CassiaWindowList instance
  acceptNewLauncher(appId) {
    // First check if another instance is configured as a panel launcher,
    // if one is found, sent this new launcher to that instance
    if (this._settings.getValue("group-windows")!=GroupType.Launcher) {
       let applets = AppletManager.getRunningInstancesForUuid("CassiaWindowList@klangman");
       for (let i=0 ; i < applets.length ; i++) {
          if (applets[i] != this && applets[i].isLauncher()) {
             //log("Sending new launcher request to the launcher instance!");
             applets[i].acceptNewLauncher(appId);
             return;
          }
       }
    }
    let currentWs = global.screen.get_active_workspace_index();
    for (let i = 0; i < this._workspaces.length; i++) {
      let ws = this._workspaces[i];
      if (ws._wsNum == currentWs) {
        ws.pinAppId(appId);
        break;
      }
    }
  }

  // Check other instances of the CassiaWindowList applet and populate the list of hidden applications
  // based on which applications other instances have pinned.
  checkForLauncherApplications() {
     let wsIdx = global.screen.get_active_workspace_index();
     let applets = AppletManager.getRunningInstancesForUuid("CassiaWindowList@klangman");
     //log( `Found ${applets.length} cassia window list applets!` );
     for (let i=0 ; i < applets.length ; i++) {
        if (applets[i] != this) {
           // TODO: Marge the list of pinned apps in case there are more then two instances
           this._hiddenApps = applets[i].getPinnedList();
           //log( `Found ${this._hiddenApps[wsIdx].length} apps to hide on workspace ${wsIdx}` );
           //this._hiddenApps.push(...appList); // Use the "Spread Syntax" to concat to existing array
        }
     }
  }


  shouldAppBeHidden(app) {
     let wsIdx = global.screen.get_active_workspace_index();
     let workspace = this.getCurrentWorkSpace();
     if (this._settings.getValue("hide-panel-apps") && this._hiddenApps) {
        for (let i=0 ; i < this._hiddenApps[wsIdx].length ; i++) {
           if (workspace._lookupApp(this._hiddenApps[wsIdx][i]) === app)
              return(true);
        }
     }
     return(false);
  }

  // Request all other CassiaWindowLists to update there list of pinned apps to be hidden.
  // This will trigger all other windowlist to call back to this windowlist to get the
  // current list of pinned application!
  updateOtherWindowLists(){
      let applets = AppletManager.getRunningInstancesForUuid("CassiaWindowList@klangman");
      for (let i=0 ; i < applets.length ; i++) {
         if (applets[i] != this)
            applets[i].pinnedListUpdated();
      }
  }

  // API that other instances of CassiaWindowList can use to inform this windowlist of new launcher state
  pinnedListUpdated() {
     this._hiddenApps = [];
     this.checkForLauncherApplications();
     // Call _updateVisibility() for all buttons
     let workspace;
     for ( let wsIdx=0 ; wsIdx < this._workspaces.length ; wsIdx++) {
        workspace = this._workspaces[wsIdx];
        for ( let btnIdx=0 ; btnIdx < workspace._appButtons.length ; btnIdx++) {
           workspace._appButtons[btnIdx]._updateVisibility();
        }
     }
  }

  // An API that returns a list of pinned applications on this window list
  getPinnedList(){
    let result;
    result = this._settings.getValue("pinned-apps");
    //log( `pinned apps for ${result.length} work spaces` );
    //for (let idx=0 ; idx < result.length ; idx++ ){
    //   log( `pinned apps for ws ${idx}: ${result[idx].length}` );
    //   for (let idx2=0 ; idx2 < result[idx].length ; idx2++ ){
    //      log( `result[${idx}][${idx2}] = ${result[idx][idx2]}` );
    //   }
    //}
    return(result);
  }

  // An API that returns true if this applet is configured as a Launcher (used by other app instances)
  isLauncher(){
     return(this._settings.getValue("group-windows")===GroupType.Launcher);
  }
}

// Called by cinnamon when starting this applet
function main(metadata, orientation, panelHeight, instanceId) {
  return new WindowList(orientation, panelHeight, instanceId);
}
