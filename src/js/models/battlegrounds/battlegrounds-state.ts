import { BattlegroundsPlayer } from './battlegrounds-player';

export class BattlegroundsState {
	readonly players: readonly BattlegroundsPlayer[] = [];
	readonly displayedPlayer: number;

	public static create(): BattlegroundsState {
		return new BattlegroundsState();
	}

	public getPlayer(cardId: string): BattlegroundsPlayer {
		return this.players.find(player => player.cardId === cardId) || BattlegroundsPlayer.create(cardId);
	}

	public updatePlayer(player: BattlegroundsPlayer): BattlegroundsState {
		const newPlayers: readonly BattlegroundsPlayer[] = [
			player,
			...this.players.filter(pl => pl.cardId !== player.cardId),
		].sort((a, b) => a.leaderboardPlace - b.leaderboardPlace);
		return Object.assign(new BattlegroundsState(), this, {
			players: newPlayers,
		} as BattlegroundsState);
	}
}
