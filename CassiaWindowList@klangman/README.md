This is a Cinnamon window list and panel launcher applet based on CobiWindowList with a number of additional features
designed to give you more control over how your window-list/panel-launcher operates.

![screen shot](CassiaWindowList@klangman/screenshot.png)

This applet is now available in the cinnamon-spices-applets repo meaning it can be found in the "Applets" tool under
the "Download" tab from the cinnamon desktop settings and at the following URL:

https://cinnamon-spices.linuxmint.com/applets/view/372

If you like this applet, please go to the above link and "Like it" so that more people might learn of its existence.
Also, the more likes it gets the more encouragement I'll have to continue working on it.
Thanks!

Now that the applet is in the spices repo, I'll be using this repo to drop new features and get some testing before
pushing the changes to the spices repo. So if you what to help test new features then use the instructions below to
clone this repo and report any issues you find.

Also, since the "stable" version is now on the spices repo I will not be releasing any new "releases" ZIPs here so
ether download from the "Applets" tool or clone this repo / "code->Download ZIP" to get the latest version.

The design goals are to:

1. Allow you to declutter your window list when running many windows without having to do without button labels
2. Keyboard hot-keys to switch to specific windows so you don't have to reach for the mouse so often
3. Allow you to make full use of your mouse buttons to interact with the window list
4. A panel launcher that can activate existing windows rather than unconditionally launching new ones

## Requirements
This applet requires at least Cinnamon 4.0

## Installation
For the "Stable" version, use the "Applet" tool from the cinnamon setting, click the "Download" tab and find "Cassia Window List"

For the latest development version:
1. Clone the repo (or Download the latest repo by clinking on the green "code" button above then click "Download ZIP")
    ```
    git clone git@github.com:klangman/CassiaWindowList.git
    ```
2. If you downloaded a ZIP, decompress the zip into a directory of your choice
    ```
    unzip ~/Downloads/CassiaWindowList-main.zip
    ```
3. Change directory to the cloned repo or the decompressed ZIP file
4. Link the "CassiaWindowList@klangman" directory into the "~/.local/share/cinnamon/applets/" directory
    ```
    ln -s $PWD/CassiaWindowList@klangman ~/.local/share/cinnamon/applets/CassiaWindowList@klangman
    ```
5. Right click on the cinnamon panel that you wish to add the CassiaWindowList to and click "Applets"
6. You most likely will want to disable the existing window-list applet you are using
7. Select the "Cassia Window List" entry and then click the "+" button at the bottom of the Applet window
8. Use the "gears" icon to open the CassiaWindowList setting window and setup the preferred behaviour
9. Right click on the cinnamon panel and use "Panel edit mode" to enable moving the window-list within the panel

## Features
In addition to the features of the CobiWindowList...

 * Hotkeys: Assign hotkeys to windows and applications so you can switch-to/minimize/start application windows using the keyboard
 * Application pooling: Keeps all window list buttons from the same application together side by side
 * On demand application grouping: Allows for Group/Ungroup specific application windows on the fly
 * Label pooling: Show only one label when adjacent windows are for the same application
 * Automatic grouping/ungrouping: Group/ungroup windows for an application based on available space in the window list
 * Zoomable thumbnail windows: Thumbnail windows can be zoomed in or out using the mouse scroll wheel
 * Configurable mouse button actions for the middle, forward and back mouse buttons
 * Configurable Ctrl/Shift + mouse button actions for all 5 mouse buttons
 * One character unicode indicators characters to indicate group window count, minimized status and pinned status
 * Complete control over which window-list buttons have labels, and what the label contents are
 * Automatic configuration backup so you can restore your configuration after adding the applet to a panel again
 * Icon saturation setting allows you to change icon saturation from 0% (grayscale) to 200% (vivid)
 * The custom Icon Saturation can be applied to all icons or a subset of icons based on several criteria

 ## Feedback
You can leave a comment on cinnamon-spices.linuxmint.com using the link above, or you can create an issue here on Github.
