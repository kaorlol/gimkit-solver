interface Phaser {
	mainCharacter: {
		id: string;
	};
}

interface Room {
	connection: {
		transport: {
			ws: {
				url: string;
			};
		};
	};
}

interface Network {
	room: Room;
}

export interface Stores {
	phaser: Phaser;
	network: Network;
}