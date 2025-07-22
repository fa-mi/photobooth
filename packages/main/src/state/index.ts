import { BrowserWindow, ipcMain } from 'electron';
import type { WebContents } from 'electron';
import { interpret } from 'xstate';
import type { InterpreterFrom } from 'xstate';
import type { StreamDeck } from '@elgato-stream-deck/node';
import { openStreamDeck } from '@elgato-stream-deck/node';
import { machine } from './machine';
import type { Context } from './machine';
import type { Store } from '../store';

export type Service = InterpreterFrom<typeof machine>;

export interface TransitionData {
  value: Array<string>;
  meta: Omit<Context, 'streamdeck'>;
}

export async function setup(webContents: WebContents, store: Store) {
  let deck: StreamDeck | void;
  try {
    deck = await openStreamDeck();
    deck.clearPanel();
  } catch (e) {}

  const service = interpret(machine);
  service.start();
  service.send({ type: 'INIT', data: { streamdeck: deck, mediaPath: store.get('mediaPath') } });
  store.onDidAnyChange((newValue) => {
    service.send({ type: 'SET_CONTEXT', data: newValue });
  });

  if (deck) {
    deck.on('up', (keyIndex: number) => {
      const action = service.state.context.keys[keyIndex];
      if (!action) {
        return;
      }
      service.send(action);
    });
  }

  service.onTransition((state) => {
    const { streamdeck, ...meta } = state.context;
    webContents.send('transition', { value: state.toStrings(), meta } as TransitionData);
  });

  ipcMain.on('transition', (event, action) => {
    service.send(action);
  });

  ipcMain.on('print-photo', (event, photoUrl) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  
    printWin.loadURL(`data:text/html,
      <html>
        <body style="margin:0;padding:0;">
          <img src="${photoUrl}" style="width:100%;height:auto;" />
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>`);
  
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({ silent: true, printBackground: true }, (success, err) => {
        if (!success) console.error('Print failed:', err);
        printWin.close();
      });
    });
  });

  return {
    service,
    stop: async function stopService() {
      return deck ? await stop(deck) : undefined;
    },
  };
}

export async function stop(deck: StreamDeck) {
  try {
    await deck.clearPanel();
  } catch (e) {}
  try {
    await deck.close();
  } catch (e) {}
}
