import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, flatMap, tap } from 'rxjs/operators';
import { MainWindowState } from '../models/mainwindow/main-window-state';
import { OverwolfService } from './overwolf.service';

@Injectable()
export class AppUiStoreService {
	private initDone = false;
	private mainStore: BehaviorSubject<MainWindowState>;
	private state$: Observable<MainWindowState>;
	private listeners: Listener[] = [];

	constructor(private readonly ow: OverwolfService) {
		this.init();
	}

	public listen<T>(selector: (fullState: MainWindowState) => T): Observable<T> {
		const value = selector(this.mainStore.value);
		const obs$ = new BehaviorSubject<T>(value);
		this.listeners.push({
			selector: selector,
			observable: obs$,
		});
		return obs$;
	}

	private async init() {
		this.startInit();
		await this.waitForInit();
		this.listenForUpdates();
	}

	private listenForUpdates() {
		this.state$ = this.mainStore.asObservable();
		console.debug('state$', this.state$);
		this.state$
			.pipe(
				filter((newState) => !!newState),
				tap((newState) => {
					console.debug('received new state in store', newState);
				}),
				flatMap((newState) =>
					this.listeners.map((listener) => ({
						output: listener.selector(newState),
						obs: listener.observable,
					})),
				),
				filter((output) => output.output),
				tap((output) => output.obs.next(output.output)),
			)
			.subscribe();
	}

	private startInit() {
		if (this.initDone) {
			return;
		}

		this.mainStore = this.ow.getMainWindow()?.mainWindowStore;
		if (!this.mainStore) {
			setTimeout(() => this.init(), 100);
			return;
		}
		this.initDone = true;
	}

	private waitForInit(): Promise<void> {
		return new Promise<void>((resolve) => {
			const serviceWait = () => {
				if (this.initDone) {
					resolve();
				} else {
					setTimeout(() => serviceWait(), 50);
				}
			};
			serviceWait();
		});
	}
}

interface Listener {
	selector: (state: MainWindowState) => any;
	observable: BehaviorSubject<any>;
}
