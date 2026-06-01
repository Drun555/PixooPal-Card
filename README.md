# PixooPal Card

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Drun555&repository=PixooPal-Card&category=plugin)

Lovelace card for PixooPal clockface inputs.

## YAML-Mode

If your dashboard is in YAML mode, you'll need to manually add it:

```yaml
url: /hacsfiles/PixooPal-Card/pixoopal-card.js
type: module
```

## Usage

There's no actual configuration for the card. It will automatically bind itself to your integration entity:
```yaml
type: custom:pixoopal-card
```

And if you have multiple PixooPal integration entries for multiple Pixoo's, then you'll have to add an entry_id.
You can find it inside .storage/core.config_entries
```yaml
type: custom:pixoopal-card
entry_id: YOUR_CONFIG_ENTRY_ID
```

## Example

I crafted a little vertical-stack for myself. Feel free to use it.

Used cards:
[Notify Card](https://github.com/bernikr/lovelace-notify-card)
[WebRTC Card](https://github.com/AlexxIT/WebRTC)
[Card Mod](https://github.com/thomasloven/lovelace-card-mod)

<img width="552" height="1055" alt="image" src="https://github.com/user-attachments/assets/8310f9be-5972-4fdc-9169-12857d923e55" />

... But I'm pretty sure you can do better.

```yaml
type: vertical-stack
card_mod:
  style: |
    #root {
      padding: 10px;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      backdrop-filter: var(--ha-card-backdrop-filter, none);
      box-shadow: var(--ha-card-box-shadow, none);
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
cards:
  - type: tile
    entity: light.pixoopal_display
    vertical: false
    features:
      - type: light-brightness
    features_position: inline
    card_mod:
      style: |
        ha-card {
          padding: 0 5px 5px 5px;
        }
  - type: custom:webrtc-camera
    entity: camera.pixoopal_preview
    mode: mjpeg
    muted: true
    visibility:
      - condition: state
        entity: light.pixoopal_display
        state: "on"
    card_mod:
      style: |
        ha-card {
          margin: 0 0 14px 0;
          padding: 1em;
          overflow: hidden !important;
          border-radius: 16px !important;
          background: #000;
          contain: paint;
        }
    style: |
      :host {
        display: block;
        overflow: hidden !important;
        border-radius: 16px !important;
        clip-path: inset(0 round 16px);
        padding: 0px;
        aspect-ratio: 1/1
      }

      video,
      canvas,
      img {
        display: block !important;
        width: 100% !important;
        aspect-ratio: 1 / 1;
        object-fit: fill;
        image-rendering: crisp-edges;
        image-rendering: pixelated;
        border-radius: 16px !important;
        clip-path: inset(0 round 16px);
        overflow: hidden !important;
        background: #000;
      }

      video::-webkit-media-controls,
      video::-webkit-media-controls-enclosure,
      video::-webkit-media-controls-panel {
        display: none !important;
      }
  - type: tile
    entity: select.pixoopal_clockface
    hide_state: true
    vertical: false
    visibility:
      - condition: state
        entity: light.pixoopal_display
        state: "on"
    features:
      - type: select-options
    features_position: bottom
    card_mod:
      style: |
        ha-card {
          margin: 0;
          padding: 0 !important;
          margin-top: 0px !important;
          border: 0;
        }

        ha-tile {
          padding: 0;
        }
  - type: custom:pixoopal-card
    visibility:
      - condition: state
        entity: light.pixoopal_display
        state: "on"
    card_mod:
      style: |
        ha-card {
          margin: 0;
          padding: 0 !important;
          border: 0;
        }
  - type: custom:notify-card
    label: ...
    card_title: ""
    action: pixoopal.notify
    visibility:
      - condition: state
        entity: light.pixoopal_display
        state: "on"
    card_mod:
      style: |
        :host {
          border: 0;
        }
        ha-card {
          margin: 0;
          padding: 14px 0 0 0 !important;
        }
    data:
      message: "{{ msg }}"
      beep: false

```

