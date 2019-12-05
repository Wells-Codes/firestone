import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	OnDestroy,
	ViewEncapsulation,
	ViewRef,
} from '@angular/core';
import { Notification, NotificationsService, NotificationType } from 'angular2-notifications';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DebugService } from '../services/debug.service';
import { ShowAchievementDetailsEvent } from '../services/mainwindow/store/events/achievements/show-achievement-details-event';
import { ShowCardDetailsEvent } from '../services/mainwindow/store/events/collection/show-card-details-event';
import { MainWindowStoreEvent } from '../services/mainwindow/store/events/main-window-store-event';
import { Message } from '../services/notifications.service';
import { OverwolfService } from '../services/overwolf.service';
import { ProcessingQueue } from '../services/processing-queue.service';

declare var amplitude;

@Component({
	selector: 'notifications',
	styleUrls: [
		'../../css/global/components-global.scss',
		'../../css/component/notifications/notifications.component.scss',
		'../../css/component/notifications/notifications-achievements.scss',
		'../../css/component/notifications/notifications-decktracker.scss',
		'../../css/component/notifications/notifications-replays.scss',
	],
	encapsulation: ViewEncapsulation.None,
	template: `
		<div class="notifications">
			<simple-notifications [options]="toastOptions" (onCreate)="created($event)" (onDestroy)="destroyed($event)">
			</simple-notifications>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
// Maybe use https://www.npmjs.com/package/ngx-toastr instead
export class NotificationsComponent implements AfterViewInit, OnDestroy {
	timeout = 10000;
	// timeout = 9999999;
	toastOptions = {
		timeOut: this.timeout,
		pauseOnHover: false,
		showProgressBar: false,
		maxStack: 5,
	};

	private windowId: string;
	private mainWindowId: string;
	private activeNotifications: ActiveNotification[] = [];
	private notificationsEmitterBus: BehaviorSubject<Message>;
	private messageReceivedListener: (message: any) => void;
	private gameInfoListener: (message: any) => void;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;
	private settingsEventBus: EventEmitter<[string, string]>;

	private processingQueue = new ProcessingQueue<Message>(
		eventQueue => this.processQueue(eventQueue),
		200,
		'notifications',
	);

	constructor(
		private notificationService: NotificationsService,
		private cdr: ChangeDetectorRef,
		private debugService: DebugService,
		private ow: OverwolfService,
		private elRef: ElementRef,
	) {}

	async ngAfterViewInit() {
		this.cdr.detach();
		this.messageReceivedListener = this.ow.addMessageReceivedListener(message => {
			const messageObject: Message = JSON.parse(message.content);
			// console.log(
			// 	'received message in notification window',
			// 	messageObject.notificationId,
			// 	messageObject.theClass,
			// 	messageObject,
			// );
			this.processingQueue.enqueue(messageObject);
		});
		this.gameInfoListener = this.ow.addGameInfoUpdatedListener(message => {
			// console.log('state changed, resizing and repositioning', message);
			this.resize();
		});
		this.windowId = (await this.ow.getCurrentWindow()).id;
		this.mainWindowId = (await this.ow.obtainDeclaredWindow('CollectionWindow')).id;
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		this.settingsEventBus = this.ow.getMainWindow().settingsEventBus;
		this.notificationsEmitterBus = this.ow.getMainWindow().notificationsEmitterBus;
		this.notificationsEmitterBus.subscribe((message: Message) => {
			if (message) {
				// console.log('received message from bus in notification window', message.notificationId);
				this.processingQueue.enqueue(message);
			}
		});
		this.resize();
	}

	private async processQueue(eventQueue: readonly Message[]): Promise<readonly Message[]> {
		const event = eventQueue[0];
		await this.sendNotification(event);
		return eventQueue.slice(1);
	}

	ngOnDestroy(): void {
		this.ow.removeGameInfoUpdatedListener(this.gameInfoListener);
		this.ow.removeMessageReceivedListener(this.messageReceivedListener);
	}

	created(event) {
		console.log('notif created', event.id);
	}

	destroyed(event) {
		console.log('notif destroyed', event.id);
		const deletedNotifications = this.activeNotifications.filter(notif => notif.toast.id === event.id);
		deletedNotifications.forEach(notif => notif.subscription.unsubscribe());
		this.activeNotifications = this.activeNotifications.filter(notif => notif.toast.id !== event.id);
	}

	private async sendNotification(messageObject: Message): Promise<void> {
		return new Promise<void>(async resolve => {
			await this.waitForInit();
			const activeNotif = this.activeNotifications.find(
				notif => notif.notificationId === messageObject.notificationId,
			);
			let notification;
			try {
				notification = this.elRef.nativeElement.querySelector('.' + messageObject.notificationId);
			} catch (e) {}

			if (notification && activeNotif) {
				await this.updateAchievementNotification(
					messageObject.notificationId,
					messageObject.theClass,
					notification,
				);
			} else {
				await this.showNotification(messageObject);
			}
			resolve();
		});
	}

	private async updateAchievementNotification(notificationId: string, newClass: string, notification) {
		console.log('in confirm achievement', notificationId);
		const activeNotif = this.activeNotifications.find(notif => notif.notificationId === notificationId);
		const toast = activeNotif.toast;
		// console.log('active notif found', newClass, toast, activeNotif, notification);
		toast.theClass = newClass;
		notification.classList.add(newClass);
		// console.log('updated notif', notification);
		if (newClass === 'pending' && activeNotif.timeoutHandler) {
			console.log('canceling fade out timeout');
			clearTimeout(activeNotif.timeoutHandler);
		} else if (newClass === 'active') {
			notification.classList.remove('unclickable');
			setTimeout(() => {
				this.fadeNotificationOut(notificationId);
			}, 5000);
		}
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}

	private async showNotification(messageObject: Message) {
		return new Promise<void>(async resolve => {
			// console.log('showing notification', messageObject.notificationId);
			const htmlMessage: string = messageObject.content;
			const cardId: string = messageObject.cardId;
			const type: string = messageObject.type;
			const additionalTimeout: number = messageObject.timeout || 0;
			await this.ow.restoreWindow(this.windowId);
			const override: any = {
				// Achievement apps are timed out manually
				// timeOut: messageObject.app === 'achievement' ? 999999 : this.timeout + additionalTimeout,
				timeOut: this.timeout + additionalTimeout,
				clickToClose: messageObject.clickToClose === false ? false : true,
			};
			// console.log('will override with options', override, messageObject);
			let timeoutHandler;
			if (type === 'achievement-no-record') {
				override.timeOut = 999999; // Closing this one manually
				timeoutHandler = setTimeout(() => {
					console.debug('manually closing achievmeent notif');
					this.fadeNotificationOut(messageObject.notificationId);
				}, this.timeout + additionalTimeout);
			}

			const toast = this.notificationService.html(htmlMessage, NotificationType.Success, override);
			toast.theClass = messageObject.theClass;
			// console.log('created toast', toast.id, messageObject.notificationId);
			if (!(this.cdr as ViewRef).destroyed) {
				this.cdr.detectChanges();
			}
			// console.log('running toast message in zone', toast);
			const subscription: Subscription = toast.click.subscribe((event: MouseEvent) => {
				console.log('registered click on toast', messageObject);
				let currentElement: any = event.srcElement;
				while (currentElement && (!currentElement.className || !currentElement.className.indexOf)) {
					currentElement = currentElement.parentElement;
				}
				// console.log('currentElemetn', currentElement);
				// Clicked on close, don't show the card
				if (currentElement && currentElement.className && currentElement.className.indexOf('close') !== -1) {
					amplitude
						.getInstance()
						.logEvent('notification', { 'event': 'close', 'app': messageObject.app, 'type': type });
					// Force close if it's not configured to auto close
					if (override.clickToClose === false) {
						this.notificationService.remove(toast.id);
					}
					console.log('closing notif');
					// this.notificationService.remove(toast.id);
					return;
				}
				// Clicked on settings, don't show the card and don't close
				if (
					currentElement &&
					currentElement.className &&
					currentElement.className.indexOf('open-settings') !== -1
				) {
					amplitude
						.getInstance()
						.logEvent('notification', { 'event': 'show-settings', 'app': messageObject.app, 'type': type });
					event.preventDefault();
					event.stopPropagation();
					this.showSettings();
					// console.log('showing settings');
					return;
				}
				// console.log('currentElemetn before', currentElement, event.srcElement);
				while (
					currentElement &&
					!currentElement.classList.contains('unclickable') &&
					currentElement.parentElement
				) {
					currentElement = currentElement.parentElement;
					// console.log('currentElemetn pendant', currentElement);
				}
				// console.log('currentElemetn after', currentElement);
				if (currentElement && currentElement.classList.contains('unclickable')) {
					amplitude
						.getInstance()
						.logEvent('notification', { 'event': 'unclickable', 'app': messageObject.app, 'type': type });
					currentElement.classList.add('shake');
					setTimeout(() => {
						currentElement.classList.remove('shake');
					}, 500);
					event.preventDefault();
					event.stopPropagation();
					console.log('unclickable');
					return;
				}
				amplitude
					.getInstance()
					.logEvent('notification', { 'event': 'click', 'app': messageObject.app, 'type': type });
				if (messageObject.eventToSendOnClick) {
					console.log('event to send on click', messageObject.eventToSendOnClick);
					const eventToSend = messageObject.eventToSendOnClick();
					this.stateUpdater.next(eventToSend);
				}
				if (cardId) {
					// console.log('wxith card id', cardId);
					const isAchievement = messageObject.app === 'achievement';
					if (isAchievement) {
						// console.log('sending message', this.mainWindowId);
						this.stateUpdater.next(new ShowAchievementDetailsEvent(cardId));
						this.fadeNotificationOut(messageObject.notificationId);
					} else {
						this.stateUpdater.next(new ShowCardDetailsEvent(cardId));
					}
				}
				if (!(this.cdr as ViewRef).destroyed) {
					this.cdr.detectChanges();
				}
			});
			const activeNotif: ActiveNotification = {
				toast: toast,
				subscription: subscription,
				timeoutHandler: timeoutHandler,
				notificationId: messageObject.notificationId,
				type: type,
			};
			this.activeNotifications.push(activeNotif);
			amplitude
				.getInstance()
				.logEvent('notification', { 'event': 'show', 'app': messageObject.app, 'type': type });
			resolve();

			setTimeout(() => {
				let notification;
				try {
					notification = this.elRef.nativeElement.querySelector('.' + messageObject.notificationId);
				} catch (e) {}
				if (notification) {
					notification.classList.add(messageObject.theClass);
				}
			}, 200);
		});
	}

	private fadeNotificationOut(notificationId: string) {
		const activeNotif = this.activeNotifications.find(notif => notif.notificationId === notificationId);
		if (!activeNotif) {
			console.log('notif already removed', notificationId, this.activeNotifications);
			return;
		}
		const notification = this.elRef.nativeElement.querySelector('.' + notificationId);
		notification.classList.add('fade-out');
		console.log('manually fading out notification', notificationId);
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
		const toast = activeNotif.toast;
		setTimeout(() => {
			this.notificationService.remove(toast.id);
		}, 500);
	}

	private resize() {
		setTimeout(async () => {
			const wrapper = this.elRef.nativeElement.querySelector('.simple-notification-wrapper');
			const width = 500;
			const gameInfo = await this.ow.getRunningGameInfo();
			// console.log(
			// 	'game info',
			// 	gameInfo,
			// 	wrapper,
			// 	wrapper.getBoundingClientRect(),
			// 	this.activeNotifications.length,
			// );
			if (!gameInfo) {
				return;
			}
			const gameWidth = gameInfo.logicalWidth;
			// const gameHeight = gameInfo.logicalHeight;
			// const dpi = gameWidth / gameInfo.width;
			await this.ow.changeWindowSize(this.windowId, width, gameInfo.height - 20);
			// https://stackoverflow.com/questions/8388440/converting-a-double-to-an-int-in-javascript-without-rounding
			const newLeft = gameWidth - width;
			const newTop = 1;
			await this.ow.changeWindowPosition(this.windowId, newLeft, newTop);
		});
	}

	private async showSettings() {
		console.log('showing settings');
		this.settingsEventBus.next(['achievements', 'capture']);
		const window = await this.ow.obtainDeclaredWindow('SettingsWindow');
		await this.ow.restoreWindow(window.id);
	}

	private waitForInit(): Promise<void> {
		return new Promise<void>(resolve => {
			const theWait = () => {
				// console.log('[notificationbs] waiting for init');
				if (this.windowId) {
					// console.log('wait for db init complete');
					resolve();
				} else {
					// console.log('waiting for db init');
					setTimeout(() => theWait(), 50);
				}
			};
			theWait();
		});
	}
}

interface ActiveNotification {
	readonly toast: Notification;
	readonly subscription: Subscription;
	readonly notificationId: string;
	readonly type?: string;
	readonly timeoutHandler?: NodeJS.Timeout;
}
