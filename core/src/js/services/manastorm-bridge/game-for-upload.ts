import { MatchResultType } from '../../models/mainwindow/replays/match-result.type';
import { StatGameFormatType } from '../../models/mainwindow/stats/stat-game-format.type';
import { StatGameModeType } from '../../models/mainwindow/stats/stat-game-mode.type';

export class GameForUpload {
	id: string;
	reviewId: string;
	title: string;

	spectating: boolean;

	gameMode: StatGameModeType;
	gameFormat: StatGameFormatType;
	buildNumber: number;
	scenarioId: number;
	playerRank: string;
	newPlayerRank: string;
	opponentRank: string;
	result: MatchResultType;
	// arenaInfo: any;
	durationTimeSeconds: number;
	durationTurns: number;
	ended: boolean;

	player: Player = new Player();
	opponent: Player = new Player();

	deckstring: string;
	deckName: string;
	replay: string;

	// We don't send this over the network, but it avoids compression / decompression when
	// using it locally in the GS
	uncompressedXmlReplay: string;

	static createEmptyGame(id: string): GameForUpload {
		const game = new GameForUpload();
		game.id = id;
		return game;
	}
}

export class Player {
	name: string;
	class: string;
	hero: string;
}
