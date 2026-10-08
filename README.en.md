<p align="center">
  <img src="docs/images/cover.png" alt="Float Up title artwork" width="720" />
</p>

<h1 align="center">Float Up</h1>

<p align="center">Compose image motion visually. Export a scene your website can use directly.</p>

<p align="center">
  <a href="https://saisai-me.github.io/float-up/">Live demo</a>
  &nbsp;·&nbsp;
  <a href="README.md">中文说明</a>
  &nbsp;·&nbsp;
  <a href="docs/react-api.md">React API</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">MIT License</a>
</p>

## Screens

| 01 · Introduction | 02 · Editor |
| :---: | :---: |
| [![Float Up introduction](docs/images/intro.png)](docs/images/intro.png) | [![Float Up editor](docs/images/editor.png)](docs/images/editor.png) |

The introduction has a looping field of floating illustrations. In the editor, select images on the canvas, adjust motion in the inspector, and use the play button to preview the full scene without leaving the workspace.

## Features

| | |
| --- | --- |
| **Direct editing** | Add or drop transparent and opaque images. Move them on the canvas; drag the handles to set direction, rotation, and size. |
| **Per-element motion** | Set duration, a one-way cubic Bézier speed curve, once or loop playback, and an end behavior: stop at the selected point or fly offstage. |
| **In-place preview** | Replay one selected element or the entire composition. One-shot previews return to the editing canvas automatically; loop previews can be stopped manually. |
| **Portable export** | Download a transparent web component with embedded images, editable JSON, image assets, and instructions for coding agents. |

Your images stay in the browser. The editor automatically saves images and motion settings in this browser's IndexedDB, so you can resume after closing or refreshing the page; clearing site data removes the draft. The editor targets desktop and accepts images your browser can decode; uncommon formats are converted to PNG for export. The runtime respects `prefers-reduced-motion`.

## Quick start

1. Open the [live editor](https://saisai-me.github.io/float-up/) and choose **Start making**.
2. Use **+** to add images, select an element to tune its motion, and press play to preview.
3. Choose **Export**, check the preview, and download `float-up-website.zip`.
4. Put `float-up.js` in your website and use the embed snippet in the ZIP's `README.md`. No React or npm is needed at runtime.

To keep editing, choose the ZIP with **+** or drop it onto the canvas. You can also import its JSON together with the matching images.

### Export contents

| File | Purpose |
| --- | --- |
| `float-up.js` | Standalone web component with embedded images; the only runtime file your site needs. |
| `float-up-layout.json` | Positions, sizes, directions, speed curves, end behaviors, and playback modes. |
| `ornaments/` | Images for future edits; uncommon formats are saved as PNG. |
| `README.md` | Exact embed snippet and playback instructions. |
| `AGENTS.md` | Integration instructions for coding agents. |
| `LICENSE.txt` | MIT license for the exported runtime. |

## Other ways to integrate

Using React? Follow the [React API guide](docs/react-api.md) to integrate the motion component directly. To improve Float Up, see the [contribution guide](CONTRIBUTING.md).

## Credits

The code and `public/demo/` samples are under the [MIT License](LICENSE). The looping introduction artwork comes from Microsoft Fluent Emoji, with its [MIT license and attribution](public/landing/SOURCE.md). Users retain the rights to their own uploaded images.
