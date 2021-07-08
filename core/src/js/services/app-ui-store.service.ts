import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, flatMap, tap } from 'rxjs/operators';
import { MainWindowState } from '../models/mainwindow/main-window-state';
import { NavigationState } from '../models/mainwindow/navigation/navigation-state';
import { MainWindowStoreEvent } from './mainwindow/store/events/main-window-store-event';
import { OverwolfService } from './overwolf.service';
import { removeFromArray } from './utils';

type Selector<T> = (fullState: [MainWindowState, NavigationState]) => T;

export class UnsubscribeSubject<T> extends BehaviorSubject<T> {
	public onUnsubscribe: () => void;

	public unsubscribe() {
		this.onUnsubscribe();
		this.unsubscribe();
	}
}

@Injectable()
export class AppUiStoreService {
	private initDone = false;
	private listeners: Listener[] = [];

	private state$: Observable<[MainWindowState, NavigationState]>;
	private mainStore: BehaviorSubject<[MainWindowState, NavigationState]>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService) {
		this.init();
	}

	public listen<S extends Selector<any>[]>(
		...selectors: S
	): BehaviorSubject<{ [K in keyof S]: S[K] extends Selector<infer T> ? T : never }> {
		const values: any = selectors.map((selector) => selector(this.mainStore.value));
		const obs$ = new UnsubscribeSubject<any>(values);
		const listener = {
			selectors: selectors,
			observable: obs$,
		};
		this.listeners.push(listener);
		obs$.onUnsubscribe = () => {
			console.debug('removing listener', listener, this.listeners);
			removeFromArray(this.listeners, listener);
			console.debug('after remove', this.listeners);
		};
		return obs$;
	}

	public send(event: MainWindowStoreEvent) {
		this.stateUpdater.next(event);
	}

	private async init() {
		this.startInit();
		await this.waitForInit();
		this.listenForUpdates();
	}

	private listenForUpdates() {
		this.state$ = this.mainStore.asObservable();
		this.state$
			.pipe(
				filter((newState) => !!newState),
				tap((newState) => console.debug('received new state in store', newState)),
				tap((newState) => console.debug('all listeners', this.listeners)),
				flatMap((newState) =>
					this.listeners.map((listener) => ({
						output: listener.selectors.map((selector) => selector(newState)),
						obs: listener.observable,
					})),
				),
				// Only send back the info if it's different from the previously sent one
				filter((output) => output.output && !areEqual(output.obs.value as any[], output.output)),
				tap((output) => console.debug('notifying', output)),
				tap((output) => output.obs.next(output.output)),
			)
			.subscribe();
	}

	private startInit() {
		if (this.initDone) {
			return;
		}

		this.mainStore = this.ow.getMainWindow()?.mainWindowStoreMerged;
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		if (!this.mainStore || !this.stateUpdater) {
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

const areEqual = (first: any[], second: any[]): boolean => {
	if (first?.length !== second?.length) {
		return false;
	}
	return first.every((f, index) => f === second[index]);
};

interface Listener {
	selectors: ((state: [MainWindowState, NavigationState]) => any)[];
	observable: BehaviorSubject<any>;
}
