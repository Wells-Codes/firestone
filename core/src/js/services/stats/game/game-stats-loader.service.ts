import { Injectable } from '@angular/core';
import { ArchetypeConfig } from '@firestone-hs/categorize-deck/dist/archetype-service';
import { ArchetypeStats } from '@firestone-hs/cron-build-ranked-archetypes/dist/archetype-stats';
import { GameStat } from '../../../models/mainwindow/stats/game-stat';
import { GameStats } from '../../../models/mainwindow/stats/game-stats';
import { ApiRunner } from '../../api-runner';
import { DeckParserService } from '../../decktracker/deck-parser.service';
import { OverwolfService } from '../../overwolf.service';

const GAME_STATS_ENDPOINT = 'https://api.firestoneapp.com/retrieveUserMatchStats/matchStats';
const ARCHETYPE_CONFIG_ENDPOINT = 'https://static.zerotoheroes.com/api/decks-config.json';
const ARCHETYPE_STATS_ENDPOINT = 'https://static.zerotoheroes.com/api/ranked-decks.json?v=3';

@Injectable()
export class GameStatsLoaderService {
	private gameStats: GameStats;

	constructor(private api: ApiRunner, private ow: OverwolfService, private deckParser: DeckParserService) {}

	public async retrieveArchetypesConfig(): Promise<readonly ArchetypeConfig[]> {
		const config = await this.api.callGetApiWithRetries<readonly ArchetypeConfig[]>(ARCHETYPE_CONFIG_ENDPOINT);
		console.log('[game-stats-loader] retrieving archetype config');
		return config;
	}

	public async retrieveArchetypesStats(): Promise<ArchetypeStats> {
		const stats = await this.api.callGetApiWithRetries<ArchetypeStats>(ARCHETYPE_STATS_ENDPOINT);
		console.log('[game-stats-loader] retrieving archetype stats');
		return stats;
	}

	public async retrieveStats(retriesLeft = 5): Promise<GameStats> {
		const user = await this.ow.getCurrentUser();
		const input = {
			userId: user.userId,
			userName: user.username,
			uploaderToken: `overwolf-${user.userId}`,
		};
		// const input = {
		// 	userId: 'OW_b874780e-9fba-49e2-82ff-b3530b0b7d7a',
		// 	uploaderToken: `overwolf-OW_b874780e-9fba-49e2-82ff-b3530b0b7d7a`,
		// };
		console.log('[game-stats-loader] retrieving stats', user);
		const data = await this.api.callPostApiWithRetries(GAME_STATS_ENDPOINT, input, retriesLeft);

		const endpointResult: readonly GameStat[] = (data as any)?.results ?? [];
		this.gameStats = Object.assign(new GameStats(), {
			stats: endpointResult
				.map(stat => ({
					...stat,
					playerDecklist: this.deckParser.normalizeDeckstring(stat.playerDecklist, stat.playerCardId),
					// Because old stats are corrupted
					currentDuelsRunId:
						stat.creationTimestamp < new Date('2020-12-14').getTime() ? null : stat.currentDuelsRunId,
				}))
				.map(stat => Object.assign(new GameStat(), stat)) as readonly GameStat[],
		} as GameStats);
		console.log(
			'[game-stats-loader] Retrieved game stats for user',
			this.gameStats.stats?.length,
			this.gameStats.stats?.length && this.gameStats.stats[0],
		);
		return this.gameStats;
	}
}
