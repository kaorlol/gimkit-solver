declare global {
	interface Window {
		stores: {
			phaser: {
				mainCharacter: {
					id: string;
				};
			},
			network: {
				room: {
					connection: {
						transport: {
							ws: {
								url: string;
							}
						};
					};
				};
			};
		};
	}
}

export interface Packet {
	key?: string;
	deviceId?: string;
	answer?: string;
	upgradeName?: string;
	level?: number;
	questionId?: string;
	data?: {
		[key: string]: string;
	};
}

export interface Change {
	id: string;
	data: {
		[key: string]: string;
	};
}

export interface Question {
	_id: string;
	answers: {
		_id: string;
		text: string;
		correct: boolean;
	}[];
	text: string;
	type: "text" | "mc";
}

export interface AnswererData {
	questions: Question[];
	questionIdList: string[];
	currentQuestionIndex: number;
	answerDeviceId: string;
	currentQuestionId: string;
}

export interface UpgradeLevels {
	moneyPerQuestion: number;
	streakBonus: number;
	multiplier: number;
	insurance: number;
}


export enum UpgradeKeys {
	"moneyPerQuestion" = "Money Per Question",
	"streakBonus" = "Streak Bonus",
	"multiplier" = "Multiplier",
	"insurance" = "Insurance",
}

export interface UpgradeStrategy {
	// filter(
	// 	callbackfn: (value: [keyof UpgradeLevels, number, number], index: number, array: [keyof UpgradeLevels, number, number][]) => unknown,
	// 	thisArg?: unknown
	// ): [keyof UpgradeLevels, number, number][];
	find(callbackfn: (value: [keyof UpgradeLevels, number, number], index: number, array: [keyof UpgradeLevels, number, number][]) => unknown, thisArg?: unknown): [keyof UpgradeLevels, number, number] | undefined;
	[index: number]: [keyof UpgradeLevels, number, number];
}

export interface UpgradeData {
	name: keyof UpgradeLevels;
	level: number;
	price: number;
}

export interface CompletedUpgrade {
	name: keyof UpgradeLevels;
	level: number;
}

export interface Defer {
	_offset?: number;
	_length?: number;
	_str?: string | unknown;
	_bin?: ArrayBuffer;
	_float?: number | unknown;
}

export interface ChangePacket {
	changes: [number, number[], unknown[]][];
	values: string[];
}

export type PayloadValue = string | number | boolean | null | undefined | ArrayBuffer | { [key: string]: unknown };