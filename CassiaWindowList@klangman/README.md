This is a Cinnamon window list applet based on CobiWindowList with a number of additional features
designed to give you more control over how your window-list operates.

The design goals are to:

1. Allow you to declutter your window list when running many windows without having to do without button labels
2. Keyboard hot-keys to switch to specific windows so you don't have to reach for the mouse so often
3. Allow you to make full use of your mouse buttons to interact with the window list
4. A panel launcher that will activate existing windows rather then unconditionally launching new ones

## Requirements
This applet requires at least Cinnamon 4.0

## Installation
1. Download the latest release
2. Decompress the zip into the cinnamon applets directory
    ```
    cd ~/.local/share/cinnamon/applets/
    unzip ~/Downloads/CassiaWindowlist.zip
    ```
3. Right click on the cinnamon panel that you wish to add the CassiaWindowList to and click "Applets"
4. You most likely will want to disable the existing window-list applet you are using
5. Select the "Cassia Window List" entry and then click the "+" button at the bottom of the Applet window
6. Use the "gears" icon to open the CassiaWindowList setting window and setup the preferred behaviour
7. Right click on the cinnamon panel and use "Panel edit mode" to enable moving the window-list within the panel

## Features
In addition to the features of the CobiWindowList...

 * Hotkeys: Assign hotkeys to windows and applications so you can switch-to/minimize/start application windows using the keyboard
 * Application pooling: Keeps all window list buttons from the same application together side by side
 * On demand application grouping: Allows for Group/Ungroup application windows on the fly
 * Label pooling: Show only one label when adjacent windows are for the same application
 * Automatic grouping/ungrouping: Group/ungroup windows for an application based on available space in the window list
 * Zoomable thumbnail windows: Thumbnail windows can be zoomed in or out using the mouse scroll wheel
 * Configurable mouse button actions for the middle, forward and back mouse buttons
 * Configurable Ctrl/Shift + mouse button actions for all 5 mouse buttons
 * One character unicode indicators characters to indicate group window count, minimized status and pinned status
 * Total control over which window-list buttons have labels
 * Automatic configuration backup so you can restore your configuration after adding the applet to a panel again
