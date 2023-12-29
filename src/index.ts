import SocketHandler from "./modules/SocketHandler/Socket";
import Answerer from "./scripts/Answerer";
import InitHook from "./modules/Hooks";
import Buyer from "./scripts/Buyer";

const socketHandler = new SocketHandler();
socketHandler.addEventListener("socket", (event) => {
	const detail = (event as CustomEvent).detail;
	console.info("[GS] 🪝 Hooked WebSocket:", detail.url);

	InitHook();
});

const answerer = new Answerer("Packet", socketHandler);
answerer.StartReceiver();
answerer.AutoAnswer();

const buyer = new Buyer(socketHandler);
buyer.StartReceiver();
buyer.AutoBuy();

socketHandler.GetSocket();

console.info("[GS] 🚀 Started Gimkit Solver");
console.info("[GS] 📦 Version 1.3.5");
console.info("[GS] 📋 Features:\n\t- Auto answer\n\t- Auto buy (Only on classic mode for now)");