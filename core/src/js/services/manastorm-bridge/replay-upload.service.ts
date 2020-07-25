import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import S3 from 'aws-sdk/clients/s3';
import AWS from 'aws-sdk/global';
import * as JSZip from 'jszip';
import { Events } from '../events.service';
import { OverwolfService } from '../overwolf.service';
import { GameForUpload } from './game-for-upload';

const REVIEW_INIT_ENDPOINT = 'https://husxs4v58a.execute-api.us-west-2.amazonaws.com/prod';
const BUCKET = 'com.zerotoheroes.batch';

@Injectable()
export class ReplayUploadService {
	constructor(private http: HttpClient, private ow: OverwolfService, private readonly events: Events) {}

	public async uploadGame(game: GameForUpload) {
		if (!game.reviewId) {
			console.error('[manastorm-bridge] Could not upload game, no review id is associated to it');
			return;
		}

		console.log('[manastorm-bridge] uploading game');
		const user = await this.ow.getCurrentUser();
		console.log('[manastorm-bridge] retrieved current user');
		this.postFullReview(game.reviewId, user.userId, user.username, game);
	}

	private async postFullReview(reviewId: string, userId: string, userName: string, game: GameForUpload) {
		const jszip = new JSZip.default();
		console.log('ready to zip', jszip);
		jszip.file('power.log', game.uncompressedXmlReplay);
		const blob: Blob = await jszip.generateAsync({
			type: 'blob',
			compression: 'DEFLATE',
			compressionOptions: {
				level: 9,
			},
		});
		const fileKey = Date.now() + '_' + reviewId + '.hszip';
		console.log('[manastorm-bridge] built file key', fileKey);

		// Configure The S3 Object
		AWS.config.region = 'us-west-2';
		AWS.config.httpOptions.timeout = 3600 * 1000 * 10;

		const playerRank = game.playerRank;
		const s3 = new S3();
		const params = {
			Bucket: BUCKET,
			Key: fileKey,
			ACL: 'public-read-write',
			Body: blob,
			Metadata: {
				'review-id': reviewId,
				'application-key': 'firestone',
				'user-key': userId,
				'username': userName,
				'file-type': 'hszip',
				'player-rank': playerRank ? '' + playerRank : '',
				'opponent-rank': game.opponentRank ? '' + game.opponentRank : '',
				'game-mode': game.gameMode,
				'game-format': game.gameFormat,
				'build-number': game.buildNumber ? '' + game.buildNumber : '',
				'deckstring': game.deckstring,
				'deck-name': game.deckName,
				'scenario-id': game.scenarioId ? '' + game.scenarioId : '',
				'should-zip': 'true',
			},
		};
		console.log('[manastorm-bridge] uploading with params', params);
		s3.makeUnauthenticatedRequest('putObject', params, async (err, data2) => {
			// There Was An Error With Your S3 Config
			if (err) {
				console.warn('[manastorm-bridge] An error during upload', err);
				// reject();
			} else {
				console.log('[manastorm-bridge] Uploaded game', game.id, reviewId);
				const info = {
					type: 'new-review',
					reviewId: reviewId,
					replayUrl: `http://replays.firestoneapp.com/?reviewId=${reviewId}`,
					game: game,
				};
				this.events.broadcast(Events.REVIEW_FINALIZED, info);
				this.ow.setExtensionInfo(JSON.stringify(info));
			}
		});
	}
}
