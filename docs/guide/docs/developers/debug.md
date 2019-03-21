---
id: debug
title: Debugging
---

## Debugging Botpress

Botpress uses the [debug](https://www.npmjs.com/package/debug) package to log information about dialogs, hooks, middleware, nlu and others.

### How To Use

To see all the logs, set `DEBUG=bp:* yarn start` if you're in development or `DEBUG=bp:* ./bp` if you're executing the binary.

You can set multiple namespaces by separating them by a comma:

```shell
DEBUG=bp:nlu:*,bp:dialog:* yarn start
```

### Setting Default Namespaces

You can use the `DEBUG_DEV` and `DEBUG_PROD` environment variables to set default namespaces.

Add them to your `.env` file located in your root folder:

```shell
DEBUG_DEV=bp:dialog:*,bp:nlu:intents:*
DEBUG_PROD=bp:dialog:*
```

### Available namespaces 🔬

> This feature is experimental and is subject to change

Go to `<your_url>/admin/debug` to see a complete list of the available namespaces.

You can also enable or disable them from this screen:

![Debugging](assets/debugging.png)
