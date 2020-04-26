import { EventEmitter, Injectable } from '@angular/core';
import { Preferences } from '../models/preferences';
import { Ftue } from '../models/preferences/ftue';
import { GenericIndexedDbService } from './generic-indexed-db.service';
import { OverwolfService } from './overwolf.service';

declare let amplitude;

@Injectable()
export class PreferencesService {
	public static readonly DECKTRACKER_OVERLAY_DISPLAY = 'DECKTRACKER_OVERLAY_DISPLAY';
	public static readonly DECKTRACKER_MATCH_OVERLAY_DISPLAY = 'DECKTRACKER_MATCH_OVERLAY_DISPLAY';
	public static readonly DECKTRACKER_OVERLAY_SIZE = 'DECKTRACKER_OVERLAY_SIZE';
	public static readonly TWITCH_CONNECTION_STATUS = 'TWITCH_CONNECTION_STATUS';

	private preferencesEventBus = new EventEmitter<any>();

	constructor(private indexedDb: GenericIndexedDbService, private ow: OverwolfService) {
		// It will create one per window that uses the service, but we don't really care
		// We just have to always use the one from the MainWindow
		window['preferencesEventBus'] = this.preferencesEventBus;
	}

	public getPreferences(): Promise<Preferences> {
		return this.indexedDb.getUserPreferences();
	}

	public async setValue(field: string, pref: boolean | number) {
		const prefs = await this.getPreferences();
		// console.log('setting pref', field, pref);
		const newPrefs: Preferences = { ...prefs, [field]: pref };
		amplitude.getInstance().logEvent('preference-update', {
			'field': field,
			'value': pref,
		});
		this.savePreferences(newPrefs);
	}

	public async setGlobalFtueDone() {
		const prefs = await this.getPreferences();
		const ftue: Ftue = { ...prefs.ftue, hasSeenGlobalFtue: true };
		// console.log('setting pref', field, pref);
		const newPrefs: Preferences = { ...prefs, ftue: ftue };
		this.savePreferences(newPrefs);
	}

	public async setDontConfirmVideoDeletion(dontAsk: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, dontConfirmVideoReplayDeletion: dontAsk };
		this.savePreferences(newPrefs);
	}

	public async setDontRecordAchievements(pref: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, dontRecordAchievements: pref };
		this.savePreferences(newPrefs);
	}

	public async updateAdvancedSettings(advancedSettings: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, advancedModeToggledOn: advancedSettings };
		this.savePreferences(newPrefs);
	}

	public async setHasSeenVideoCaptureChangeNotif(pref: boolean) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, hasSeenVideoCaptureChangeNotif: pref };
		this.savePreferences(newPrefs);
	}

	public async setTwitchAccessToken(pref: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchAccessToken: pref };
		this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async setTwitchUserName(pref: string) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchUserName: pref };
		this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async disconnectTwitch() {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, twitchAccessToken: undefined };
		this.savePreferences(newPrefs, PreferencesService.TWITCH_CONNECTION_STATUS);
	}

	public async acknowledgeFtue(pref: string) {
		const prefs = await this.getPreferences();
		const ftue = prefs.ftue;
		const newFtue = { ...ftue, [pref]: true } as Ftue;
		const newPrefs: Preferences = { ...prefs, ftue: newFtue };
		this.savePreferences(newPrefs);
	}

	public async updateTrackerPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, decktrackerPosition: { left, top } };
		this.savePreferences(newPrefs);
	}

	public async updateOpponentTrackerPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, opponentOverlayPosition: { left, top } };
		this.savePreferences(newPrefs);
	}

	public async updateSecretsHelperPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, secretsHelperPosition: { left, top } };
		this.savePreferences(newPrefs);
	}

	public async updateSecretsHelperWidgetPosition(left: number, top: number) {
		const prefs = await this.getPreferences();
		const newPrefs: Preferences = { ...prefs, secretsHelperWidgetPosition: { left, top } };
		this.savePreferences(newPrefs);
	}

	private async savePreferences(userPrefs: Preferences, eventName: string = null) {
		await this.indexedDb.saveUserPreferences(userPrefs);
		// console.log('broadcasting new prefs', userPrefs);
		const eventBus: EventEmitter<any> = this.ow.getMainWindow().preferencesEventBus;
		eventBus.next({
			name: eventName,
			preferences: userPrefs,
		});
	}
}
