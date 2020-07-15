import { BgsPostMatchStats as IBgsPostMatchStats } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { BgsBoard } from '../in-game/bgs-board';
import { BgsTavernUpgrade } from '../in-game/bgs-tavern-upgrade';
import { BgsTriple } from '../in-game/bgs-triple';
import { BooleanTurnInfo } from './boolean-turn-info';
import { NumericTurnInfo } from './numeric-turn-info';

export class BgsPostMatchStats implements IBgsPostMatchStats {
	readonly tavernTimings: readonly BgsTavernUpgrade[];
	readonly tripleTimings: readonly BgsTriple[];
	readonly rerolls: number;

	readonly replayLink: string;

	readonly boardHistory: readonly BgsBoard[];
	// readonly compositionsOverTurn: readonly BgsCompositionForTurn[];
	readonly rerollsOverTurn: readonly NumericTurnInfo[];
	readonly freezesOverTurn: readonly NumericTurnInfo[];
	readonly coinsWastedOverTurn: readonly NumericTurnInfo[];
	readonly mainPlayerHeroPowersOverTurn: readonly NumericTurnInfo[];
	readonly hpOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
	readonly leaderboardPositionOverTurn: { [playerCardId: string]: readonly NumericTurnInfo[] };
	readonly totalStatsOverTurn: readonly NumericTurnInfo[];
	readonly wentFirstInBattleOverTurn: readonly BooleanTurnInfo[];
	readonly damageToEnemyHeroOverTurn: readonly NumericTurnInfo[];

	readonly minionsBoughtOverTurn: readonly NumericTurnInfo[];
	readonly minionsSoldOverTurn: readonly NumericTurnInfo[];

	readonly totalMinionsDamageDealt: { [cardId: string]: number };
	readonly totalMinionsDamageTaken: { [cardId: string]: number };

	readonly totalEnemyMinionsKilled: number;
	readonly totalEnemyHeroesKilled: number;
	readonly luckFactor: number;

	public static create(base: BgsPostMatchStats): BgsPostMatchStats {
		return Object.assign(new BgsPostMatchStats(), base);
	}
}
