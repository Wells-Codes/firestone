import { BgsPlayer as IBgsPlayer, Entity } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { CardIds, GameTag } from '@firestone-hs/reference-data';
import { BoardEntity } from '@firestone-hs/simulate-bgs-battle/dist/board-entity';
import { getHeroPower, normalizeHeroCardId } from '../../services/battlegrounds/bgs-utils';
import { BgsBoard } from './in-game/bgs-board';
import { BgsComposition } from './in-game/bgs-composition';
import { BgsTavernUpgrade } from './in-game/bgs-tavern-upgrade';
import { BgsTriple } from './in-game/bgs-triple';

export class BgsPlayer implements IBgsPlayer {
	readonly cardId: string;
	readonly baseCardId?: string;
	readonly displayedCardId: string;
	readonly heroPowerCardId: string;
	readonly name: string;
	readonly isMainPlayer: boolean = false;
	readonly tavernUpgradeHistory: readonly BgsTavernUpgrade[] = [];
	readonly tripleHistory: readonly BgsTriple[] = [];
	readonly compositionHistory: readonly BgsComposition[] = [];
	readonly boardHistory: readonly BgsBoard[];
	readonly initialHealth: number;
	readonly damageTaken: number = 0;
	readonly leaderboardPlace: number;
	readonly currentWinStreak: number;
	readonly highestWinStreak: number;

	public static create(base: BgsPlayer): BgsPlayer {
		const startingHealth = base.cardId === CardIds.PatchwerkBattlegrounds ? 55 : 40;
		return Object.assign(new BgsPlayer(), { initialHealth: startingHealth }, base);
	}

	public update(base: BgsPlayer) {
		return Object.assign(new BgsPlayer(), this, base);
	}

	public getNormalizedHeroCardId(): string {
		return normalizeHeroCardId(this.cardId);
	}

	public getDisplayCardId(): string {
		return this.displayedCardId || this.cardId;
	}

	public getDisplayHeroPowerCardId(): string {
		return getHeroPower(this.getDisplayCardId());
	}

	public getCurrentTavernTier(): number {
		const result =
			this.tavernUpgradeHistory.length === 0
				? 1
				: this.tavernUpgradeHistory[this.tavernUpgradeHistory.length - 1].tavernTier;

		return result;
	}

	public getLastKnownBoardState(): readonly Entity[] {
		return !this.boardHistory
			? null
			: this.boardHistory.length === 0
			? []
			: this.boardHistory[this.boardHistory.length - 1].board;
	}

	public getLastBoardStateTurn(): number {
		return !this.boardHistory?.length ? undefined : this.boardHistory[this.boardHistory.length - 1].turn;
	}

	public buildBgsEntities(logEntities: readonly any[]): BoardEntity[] {
		if (!logEntities?.length) {
			return [];
		}

		return logEntities.map((entity) => this.buildBgsEntity(entity));
	}

	private buildBgsEntity(logEntity): BoardEntity {
		if (!logEntity) {
			return null;
		}

		return {
			cardId: logEntity.CardId,
			attack: logEntity.Tags.find((tag) => tag.Name === GameTag.ATK)?.Value || 0,
			divineShield: (logEntity.Tags.find((tag) => tag.Name === GameTag.DIVINE_SHIELD) || {})?.Value === 1,
			enchantments: this.buildEnchantments(logEntity.Enchantments),
			entityId: logEntity.Entity,
			health: logEntity.Tags.find((tag) => tag.Name === GameTag.HEALTH)?.Value,
			poisonous: logEntity.Tags.find((tag) => tag.Name === GameTag.POISONOUS)?.Value === 1,
			reborn: logEntity.Tags.find((tag) => tag.Name === GameTag.REBORN)?.Value === 1,
			taunt: logEntity.Tags.find((tag) => tag.Name === GameTag.TAUNT)?.Value === 1,
			cleave: undefined, // For now I'm not aware of any tag for this, so it's hard-coded in the simulator
			windfury: logEntity.Tags.find((tag) => tag.Name === GameTag.WINDFURY)?.Value === 1,
			megaWindfury:
				logEntity.Tags.find((tag) => tag.Name === GameTag.MEGA_WINDFURY)?.Value === 1 ||
				logEntity.Tags.find((tag) => tag.Name === GameTag.WINDFURY)?.Value === 3,
			friendly: true,
			frenzyApplied: false,
			definitelyDead: false,
		};
	}

	private buildEnchantments(
		enchantments: { EntityId: number; CardId: string }[],
	): { cardId: string; originEntityId: number }[] {
		if (!enchantments?.length) {
			return [];
		}

		return enchantments.map((enchant) => ({
			originEntityId: enchant.EntityId,
			cardId: enchant.CardId,
		}));
	}
}
