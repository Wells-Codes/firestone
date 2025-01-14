import { BgsPostMatchStats } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { GALAKROND_EVIL, GALAKROND_EXPLORER, Race } from '@firestone-hs/reference-data';
import { isMercenariesPvP } from '../../../services/mercenaries/mercenaries-utils';
import { capitalizeEachWord } from '../../../services/utils';
import { CoinPlayType } from '../replays/coin-play.type';
import { MatchResultType } from '../replays/match-result.type';
import { StatGameFormatType } from './stat-game-format.type';
import { StatGameModeType } from './stat-game-mode.type';

// this mirrors the data structure in the replay_summary DB
export class GameStat {
	readonly additionalResult: string;
	readonly creationTimestamp: number;
	readonly gameMode: StatGameModeType;
	readonly gameFormat: StatGameFormatType;
	readonly buildNumber: number | undefined;
	readonly scenarioId: number | undefined;
	readonly result: MatchResultType;
	readonly coinPlay: CoinPlayType;
	readonly playerName: string;
	readonly playerClass: string;
	readonly playerRank: string | undefined;
	readonly newPlayerRank: string | undefined;
	readonly playerCardId: string;
	readonly playerDecklist: string | undefined;
	readonly playerDeckName: string | undefined;
	readonly opponentClass: string;
	readonly opponentRank: string | undefined;
	readonly opponentCardId: string;
	readonly opponentName: string;
	readonly reviewId: string;
	readonly gameDurationSeconds: number;
	readonly gameDurationTurns: number;
	readonly runId: string;
	readonly playerArchetypeId?: string;
	readonly opponentArchetypeId?: string;
	readonly bgsAvailableTribes: readonly Race[];
	readonly bgsBannedTribes: readonly Race[];
	readonly bgsPerfectGame: boolean;
	readonly levelAfterMatch: string;

	readonly postMatchStats?: BgsPostMatchStats;
	readonly mercHeroTimings: readonly { cardId: string; turnInPlay: number }[];
	readonly mercOpponentHeroTimings: readonly { cardId: string; turnInPlay: number }[];
	readonly mercEquipments: readonly { mercCardId: string; equipmentCardId: string }[];
	readonly mercOpponentEquipments: readonly { mercCardId: string; equipmentCardId: string }[];

	public static create(base: GameStat): GameStat {
		return Object.assign(new GameStat(), base);
	}

	public update(base: Partial<GameStat>): GameStat {
		return Object.assign(new GameStat(), this, base);
	}

	public isDuels(): boolean {
		return this.gameMode === 'duels' || this.gameMode === 'paid-duels';
	}

	public isBattlegrounds(): boolean {
		return this.gameMode === 'battlegrounds';
	}

	public buildPlayerRankImage(): {
		frameImage?: string;
		medalImage?: string;
		tooltip?: string;
		frameDecoration?: string;
	} {
		let rankIcon;
		let rankIconTooltip;
		if (this.gameMode === 'ranked') {
			const prefix = 'standard_ranked';
			const decoration = this.buildDecoration(this.gameFormat);
			// TODO: add a "no-rank" image
			if (!this.playerRank) {
				return {};
			}
			if (this.playerRank.indexOf('legend') !== -1) {
				rankIcon = `${prefix}/legend`;
				rankIconTooltip = `${capitalizeEachWord(this.gameFormat)} Legend`;
			} else if (this.playerRank.indexOf('-') > -1) {
				const leagueId = parseInt(this.playerRank.split('-')[0]);
				const rank = this.playerRank.split('-')[1];
				const paddedRank = rank.padStart(2, '0');
				const [leagueFrame, leagueName] = this.getLeagueInfo(leagueId);
				return {
					frameImage: leagueFrame,
					medalImage: `https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/RankedPlay_Medal_Portrait_${leagueName}_${paddedRank}.png`,
					tooltip: `${capitalizeEachWord(this.gameFormat)} ${leagueName} ${rank}`,
					frameDecoration: decoration,
				};
			} else if (this.playerRank.indexOf('-') === -1) {
				rankIcon = `${prefix}/rank${this.playerRank}_small`;
				rankIconTooltip = `${capitalizeEachWord(this.gameFormat)} ${this.playerRank}`;
			} else {
				rankIcon = `${prefix}/rank25_small`;
				rankIconTooltip = `${capitalizeEachWord(this.gameFormat)} Rank 25`;
			}
		} else if (this.gameMode === 'battlegrounds') {
			rankIcon = 'battlegrounds';
			rankIconTooltip = 'Battlegrounds';
		} else if (this.gameMode?.startsWith('mercenaries')) {
			rankIcon = 'mercenaries';
			rankIconTooltip = 'Mercenaries';
		} else if (this.gameMode === 'practice') {
			if (GALAKROND_EXPLORER.indexOf(this.scenarioId) !== -1) {
				rankIcon = 'galakrond_explorers';
				rankIconTooltip = "Galakrond's Awakening - Explorers";
			} else if (GALAKROND_EVIL.indexOf(this.scenarioId) !== -1) {
				rankIcon = 'galakrond_evil';
				rankIconTooltip = "Galakrond's Awakening - E.V.I.L.";
			} else {
				rankIcon = 'casual';
				rankIconTooltip = 'Practice';
			}
		} else if (this.gameMode === 'casual') {
			rankIcon = 'casual';
			rankIconTooltip = 'Casual';
		} else if (this.gameMode === 'friendly') {
			rankIcon = 'friendly';
			rankIconTooltip = 'Friendly';
		} else if (this.gameMode === 'duels') {
			rankIcon = `casual_duels`;
			rankIconTooltip = 'Duels';
		} else if (this.gameMode === 'paid-duels') {
			rankIcon = `heroic_duels`;
			rankIconTooltip = 'Heroic Duels';
		} else if (this.gameMode === 'arena') {
			// TODO: no-rank image
			if (!this.playerRank) {
				return {};
			}
			// New format
			if (this.playerRank.indexOf('-') !== -1) {
				const wins = this.playerRank.split('-')[0];
				// const losses = this.playerRank.split('-')[1];
				rankIcon = `arena/arena${wins}wins`;
				rankIconTooltip = 'Arena';
			} else {
				rankIcon = 'arena/arena12wins';
				rankIconTooltip = 'Arena';
			}
		} else if (this.gameMode === 'tavern-brawl') {
			rankIcon = 'tavernbrawl';
			rankIconTooltip = 'Tavern Brawl';
		} else {
			rankIcon = 'arenadraft';
		}

		return {
			frameImage: `assets/images/deck/ranks/${rankIcon}.png`,
			tooltip: rankIconTooltip,
		};
	}

	private buildDecoration(gameFormat: StatGameFormatType) {
		switch (gameFormat) {
			case 'classic':
				return `https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/Medal_Classic.png`;
			case 'wild':
				return `https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/Medal_Wild.png`;
			default:
				return null;
		}
	}

	private getLeagueInfo(leagueId: number): [string, string] {
		const leagueName = this.getLeagueName(leagueId);
		return [
			`https://static.zerotoheroes.com/hearthstone/asset/firestone/images/deck/ranks/ranked/Ranked_Medal_Frame_${leagueName}.png?v=3`,
			leagueName,
		];
	}

	private getLeagueName(leagueId: number): string {
		switch (leagueId) {
			case 5:
				return 'Bronze';
			case 4:
				return 'Silver';
			case 3:
				return 'Gold';
			case 2:
				return 'Platinum';
			case 1:
				return 'Diamond';
		}
	}
}

export const buildRankText = (playerRank: string, gameMode: string, additionalResult: string): string => {
	if (
		(gameMode === 'duels' || gameMode === 'paid-duels') &&
		additionalResult &&
		additionalResult.indexOf('-') !== -1
	) {
		const [wins, losses] = additionalResult.split('-');
		return `${wins}-${losses}`;
	}
	if (!playerRank) {
		return null;
	}
	if (gameMode === 'ranked') {
		if (playerRank.indexOf('legend-') !== -1) {
			return playerRank.split('legend-')[1];
		} else if (playerRank.indexOf('-') > -1) {
			return playerRank.split('-')[1];
		}
		return playerRank;
	}
	if (gameMode === 'arena' && playerRank && playerRank.indexOf('-') !== -1) {
		const wins = playerRank.split('-')[0];
		const losses = playerRank.split('-')[1];
		return `${wins}-${losses}`;
	}
	// Bug for old matches
	if (gameMode === 'battlegrounds' && playerRank && parseInt(playerRank) > 100) {
		return playerRank;
	}
	if (isMercenariesPvP(gameMode) && !isNaN(+playerRank)) {
		return playerRank;
	}
	return null;
};
