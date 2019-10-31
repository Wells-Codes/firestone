import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MainWindowStoreEvent } from './mainwindow/store/events/main-window-store-event';
import { OverwolfService } from './overwolf.service';

@Injectable()
export class OwNotificationsService {
	private windowId: string;
	private messageId: number = 0;
	// Because if we start the app during a game, it might take some time for the notif window to
	// be created
	private retriesLeft = 30;

	private stateEmitter = new BehaviorSubject<Message>(undefined);

	constructor(private ow: OverwolfService) {
		// Give it time to boot
		setTimeout(() => this.detectNotificationsWindow(), 5000);
		window['notificationsEmitterBus'] = this.stateEmitter;
	}

	// This directly share JS objects, without stringifying them, so it lets us do some
	// fancy stuff
	public emitNewNotification(htmlMessage: Message) {
		if (!this.windowId) {
			if (this.retriesLeft <= 0) {
				throw new Error('NotificationsWindow was not identified at app start');
			} else {
				this.retriesLeft--;
				setTimeout(() => {
					this.emitNewNotification(htmlMessage);
				}, 500);
				return;
			}
		}
		this.stateEmitter.next(htmlMessage);
	}

	public html(htmlMessage: Message) {
		// console.log('[notifications-service] trying to send notification to component');
		if (!this.windowId) {
			if (this.retriesLeft <= 0) {
				throw new Error('NotificationsWindow was not identified at app start');
			} else {
				this.retriesLeft--;
				setTimeout(() => {
					this.html(htmlMessage);
				}, 500);
				return;
			}
		}
		const strMessage = JSON.stringify(htmlMessage);
		this.ow.sendMessage(this.windowId, '' + this.messageId++, strMessage);
	}

	private async detectNotificationsWindow() {
		const window = await this.ow.obtainDeclaredWindow(OverwolfService.NOTIFICATIONS_WINDOW);
		const windowId = window.id;
		await this.ow.restoreWindow(windowId);
		await this.ow.hideWindow(windowId);
		this.windowId = windowId;
	}
}

export interface Message {
	notificationId: string;
	content: string;
	cardId?: string;
	type?: string;
	app?: 'achievement' | 'collection' | 'decktracker';
	timeout?: number;
	theClass?: string;
	eventToSendOnClick?: () => MainWindowStoreEvent;
}
