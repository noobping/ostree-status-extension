# OSTree Status extension
Display the rpm-ostree status in GNOME. Click to refresh manually or wait 10 seconds for an automatic refresh.

![screenshot](screenshot.png)

## CI

The project uses [`noobping/ci`](https://github.com/noobping/ci) workflows in `.ci/`.

```sh
ci package
ci test
```

`ci test` needs GNOME Shell 50 or newer, because it uses `gnome-shell-test-tool --extension`.
