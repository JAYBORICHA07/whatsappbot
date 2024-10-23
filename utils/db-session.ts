// // utils/db-session.js
// import Session from "../models/session.model";

// export const useAuthStateFromDB = async (sessionId) => {
//   let session = await Session.findOne({ sessionId });

//   const state = session
//     ? { creds: session.creds, keys: session.keys }
//     : { creds: {}, keys: {} };

//   const saveCreds = async () => {
//     await Session.updateOne(
//       { sessionId },
//       { creds: state.creds, keys: state.keys },
//       { upsert: true }
//     );
//   };

//   return { state, saveCreds };
// };
