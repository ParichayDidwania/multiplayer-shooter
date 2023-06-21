# Shadow Ops - Tactical Multiplayer Shooter

Welcome to Shadow Ops, an adrenaline-pumping 5v5 top-down tactical multiplayer shooter game. Prepare for intense battles as you join a team of either terrorists or counter-terrorists, engaging in thrilling combat in bomb defusal mode.

## Features

- **Bomb Defusal Mode**: Experience the heart-pounding action of bomb defusal gameplay. As a terrorist, your objective is to strategically plant the bomb at designated locations and ensure its detonation. Counter-terrorists must work together to locate and defuse the bomb before it explodes.

- **Team-based Gameplay**: Coordinate with your teammates and devise strategic plans to achieve dominance on the battlefield. Effective communication and teamwork are vital in outsmarting your opponents and securing victory.

- **Proximity Sound**: Immerse yourself in the game with realistic audio effects. The Proximity Sound feature dynamically adjusts the sound based on the proximity of in-game events, enhancing the overall immersion and providing valuable audio cues for gameplay.

- **Websockets and NodeJS Backend**: Shadow Ops utilizes websockets for seamless real-time communication between players for events that require **reliability**. The backend is built on NodeJS, providing a robust foundation for smooth gameplay and a reliable multiplayer experience.

- **UDP with WebRTC Backend using Geckos.io**: Shadow Ops utilizes WebRTC for seamless real-time communication between players for events that can afford **unreliability** in order to achieve less latency. Events such as position updates, bullet shots, and bomb pick/drop are being sent and received via UDP. Geckos.io offers real-time client/server communication over UDP using WebRTC and Node.js

- **PhaserJS Frontend**: The frontend of the game is developed using PhaserJS, a powerful JavaScript game framework known for its versatility and performance.

## How to Play

### Online Play:
1. Download Latest Release and extract it. Open ShadowOps.exe inside ShadowOps-win32-x64 folder.
2. Create a room or join an existing one.
3. Invite your friends to join your lobby using the provided room id.
4. Once all players have joined the room, start the match and engage in intense multiplayer battles.

### Local Play:
1. Clone the repository to your local machine.
2. Install the necessary dependencies for both the client and server using `npm install` in the respective directories.
3. Start the backend server by using `npm run dev` command in server directory.
4. Change the server url in `client.ts` file by editing the URL variable at the top of the file to `ws://localhost:7000`.
5. Build `client.js` file using `npm run build` in the client directory.
6. Start the client server (to server static files) using `npm run start` in client directory.

## License

Shadow Ops is released under the [MIT License](https://opensource.org/licenses/MIT). You are free to modify and distribute the game in accordance with the terms and conditions of the license.

## Credits

Shadow Ops is developed and maintained by Parichay Didwania. I would like to express my gratitude to the PhaserJS and NodeJS communities for their invaluable contributions to the project.

## Contact

If you have any questions, feedback, or suggestions, please reach out to us at parichaydidwania@gmail.com.

Prepare for covert operations and tactical warfare in Shadow Ops. Sharpen your skills, create rooms, and invite your friends to dominate the battlefield!
