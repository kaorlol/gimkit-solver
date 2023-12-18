import { answer } from "../typings/answer";
import { Kit } from "../typings/Kit";
import { GetGameId } from "./GetGameId";

export async function GetAnswers(): Promise<Kit | Error> {
	const gameId = await GetGameId();
	const json = await fetch(`https://www.gimkit.com/api/games/fetch/${gameId}`).then((response) => response.json());
	return json;
}

export async function FindAnswer(question: string): Promise<answer> {
	const answers = await GetAnswers();
	if (answers instanceof Error) return null;
	const questions = answers.kit.questions;
	for (const questionObject of questions) {
		if (questionObject.text == question) {
			const answers = questionObject.answers;
			const correctAnswer = answers.find((answer) => answer.correct)?.text || null;
			const type = questionObject.type;

			return {
				answer: correctAnswer,
				type: type,
			};
		}
	}
	return null;
}
