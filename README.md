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
