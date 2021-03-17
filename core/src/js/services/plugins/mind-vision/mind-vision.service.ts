import { Injectable } from '@angular/core';
import { SceneMode } from '@firestone-hs/reference-data';
import { DuelsRewardsInfo } from '@firestone-hs/save-dungeon-loot-info/dist/input';
import { ArenaInfo } from '../../../models/arena-info';
import { BoostersInfo } from '../../../models/memory/boosters-info';
import { MemoryUpdate } from '../../../models/memory/memory-update';
import { RewardsTrackInfo } from '../../../models/rewards-track-info';
import { Events } from '../../events.service';
import { InternalHsAchievementsInfo } from './get-achievements-info-operation';

declare let OverwolfPlugin: any;

@Injectable()
export class MindVisionService {
	// Use two different instances so that the reset of the main plugin doesn't impact
	// the listener
	private mindVisionPlugin: any;
	// private mindVisionListenerPlugin: any;

	initialized = false;
	// initializedListener = false;
	memoryUpdateListener;

	constructor(private readonly events: Events) {
		this.initialize();
		// this.initializeListener();
		this.listenForUpdates();
	}

	private async listenForUpdates() {
		const plugin = await this.get();
		try {
			console.log('[mind-vision] getting ready to listen for updates');
			this.memoryUpdateListener = (changes: string | 'reset') => {
				console.log('[mind-vision] memory update', changes);
				// Happens when the plugin is reset, we need to resubscribe
				if (changes === 'reset') {
					console.log('[mind-vision] resetting memory update');
					plugin.onMemoryUpdate.removeListener(this.memoryUpdateListener);
					this.listenForUpdates();
					return;
				}
				const changesToBroadcast = JSON.parse(changes);
				if (changesToBroadcast.CurrentScene === SceneMode.INVALID) {
					console.warn('[mind-vision] INVALID scene should not be raised', changes);
					delete changesToBroadcast.CurrentScene;
					// TODO: here we should reset if we get an invalid scene + no other valid state
					// For now we only have two pieces of info so that's it
					if (
						!changesToBroadcast.DisplayingAchievementToast &&
						!changesToBroadcast.OpenedPack &&
						!changesToBroadcast.NewCards?.length
					) {
						console.warn('[mind-vision] calling reset after invalid scene');
						plugin.onMemoryUpdate.removeListener(this.memoryUpdateListener);
						this.listenForUpdates();
					}
				}
				this.events.broadcast(Events.MEMORY_UPDATE, changesToBroadcast);
			};
			plugin.onMemoryUpdate.addListener(this.memoryUpdateListener);
			plugin.listenForUpdates(result => {
				console.log('[mind-vision] listenForUpdates callback result: ', result);
			});
		} catch (e) {
			console.error('[mind-vision] could not listenForUpdates', e);
		}
	}

	public async getMemoryChanges(): Promise<MemoryUpdate> {
		return new Promise<MemoryUpdate>(async (resolve, reject) => {
			const plugin = await this.get();
			try {
				plugin.getMemoryChanges(info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse memory update', e);
				resolve(null);
			}
		});
	}

	public async getCollection(): Promise<any[]> {
		return new Promise<any[]>(async (resolve, reject) => {
			const plugin = await this.get();
			try {
				plugin.getCollection(collection => {
					resolve(collection ? JSON.parse(collection) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse collection', e);
				resolve(null);
			}
		});
	}

	public async getCardBacks(): Promise<any[]> {
		return new Promise<any[]>(async (resolve, reject) => {
			const plugin = await this.get();
			try {
				plugin.getCardBacks(cardBacks => {
					resolve(cardBacks ? JSON.parse(cardBacks) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse getCardBacks', e);
				resolve(null);
			}
		});
	}

	public async getMatchInfo(): Promise<any> {
		return new Promise<any[]>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getMatchInfo(matchInfo => {
					resolve(matchInfo ? JSON.parse(matchInfo) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse matchInfo', e);
				resolve(null);
			}
		});
	}

	public async getDuelsInfo(forceReset = false): Promise<any> {
		return new Promise<any[]>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getDuelsInfo(forceReset, info => {
					// console.log('[mind-vision] retrieved duels info', info);
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse duelsInfo', e);
				resolve(null);
			}
		});
	}

	public async getBattlegroundsInfo(forceReset = false): Promise<{ Rating: number }> {
		return new Promise<{ Rating: number }>(async resolve => {
			if (forceReset) {
				// console.log('forcing reset of mindvision', forceReset);
			}
			const plugin = await this.get();
			try {
				plugin.getBattlegroundsInfo(forceReset, battlegroundsInfo => {
					// console.log('[mind-vision] retrieved getBattlegroundsInfo', battlegroundsInfo);
					resolve(battlegroundsInfo ? JSON.parse(battlegroundsInfo) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse battlegroundsInfo', e);
				resolve(null);
			}
		});
	}

	public async getArenaInfo(): Promise<ArenaInfo> {
		return new Promise<ArenaInfo>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getArenaInfo(arenaInfo => {
					resolve(arenaInfo ? JSON.parse(arenaInfo) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse getArenaInfo', e);
				resolve(null);
			}
		});
	}

	public async getActiveDeck(): Promise<any> {
		return new Promise<any[]>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getActiveDeck(activeDeck => {
					resolve(activeDeck ? JSON.parse(activeDeck) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse activeDeck', e);
				resolve(null);
			}
		});
	}

	public async getRewardsTrackInfo(): Promise<RewardsTrackInfo> {
		return new Promise<RewardsTrackInfo>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getRewardsTrackInfo(info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse rewards track info', e);
				resolve(null);
			}
		});
	}

	public async getDuelsRewardsInfo(forceReset = false): Promise<DuelsRewardsInfo> {
		return new Promise<DuelsRewardsInfo>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getDuelsRewardsInfo(forceReset, info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse rewards track info', e);
				resolve(null);
			}
		});
	}

	public async getAchievementsInfo(forceReset = false): Promise<InternalHsAchievementsInfo> {
		return new Promise<InternalHsAchievementsInfo>(async (resolve, reject) => {
			const plugin = await this.get();
			try {
				plugin.getAchievementsInfo(forceReset, info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not get achievements info', e);
				resolve(null);
			}
		});
	}

	public async getInGameAchievementsProgressInfo(forceReset = false): Promise<InternalHsAchievementsInfo> {
		return new Promise<InternalHsAchievementsInfo>(async (resolve, reject) => {
			const plugin = await this.get();
			try {
				plugin.getInGameAchievementsProgressInfo(forceReset, info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not get achievements info', e);
				resolve(null);
			}
		});
	}

	public async getCurrentScene(): Promise<number> {
		return new Promise<number>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getCurrentScene(scene => {
					resolve(scene);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse activeDeck', e);
				resolve(null);
			}
		});
	}

	public async getBoostersInfo(): Promise<BoostersInfo> {
		return new Promise<BoostersInfo>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.getBoostersInfo(info => {
					resolve(info ? JSON.parse(info) : null);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse getBoostersInfo', e);
				resolve(null);
			}
		});
	}

	public async isMaybeOnDuelsRewardsScreen(): Promise<boolean> {
		return new Promise<boolean>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.isMaybeOnDuelsRewardsScreen(result => {
					resolve(result);
				});
			} catch (e) {
				console.log('[mind-vision] could not parse isMaybeOnDuelsRewardsScreen', e);
				resolve(null);
			}
		});
	}

	// Here we reset both plugins because this method is used only once, after
	// initialization, to be sure we refresh the plugins once the memory is
	// properly populated
	public async reset(): Promise<void> {
		console.log('[mind-vision] calling reset');
		return new Promise<void>(async resolve => {
			const plugin = await this.get();
			try {
				plugin.reset(result => {
					console.log('reset done');
					resolve(result);
				});
			} catch (e) {
				console.log('[mind-vision] could not reset', e);
				resolve(null);
			}
		});
	}

	public async get() {
		await this.waitForInit();
		return this.mindVisionPlugin.get();
	}

	private initialize() {
		this.initialized = false;
		try {
			console.log('[mind-vision] plugin init starting', this.mindVisionPlugin);
			this.mindVisionPlugin = new OverwolfPlugin('mind-vision', true);
			this.mindVisionPlugin.initialize(async (status: boolean) => {
				if (status === false) {
					console.error("[mind-vision] Plugin couldn't be loaded??", 'retrying');
					setTimeout(() => this.initialize(), 2000);
					return;
				}
				console.log('[mind-vision] Plugin ' + this.mindVisionPlugin.get()._PluginName_ + ' was loaded!');
				this.mindVisionPlugin.get().onGlobalEvent.addListener((first: string, second: string) => {
					console.log('[mind-vision] received global event', first, second);
				});
				this.initialized = true;
			});
		} catch (e) {
			console.warn('[mind-vision]Could not load plugin, retrying', e);
			setTimeout(() => this.initialize(), 2000);
		}
	}

	private waitForInit(): Promise<void> {
		return new Promise<void>(resolve => {
			const dbWait = () => {
				if (this.initialized) {
					resolve();
				} else {
					setTimeout(() => dbWait(), 500);
				}
			};
			dbWait();
		});
	}
}
