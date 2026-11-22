/**
 * Live fake activity generator — ephemeral social proof.
 * ZERO DB writes. Pure in-memory simulation.
 */

const INDIAN_HANDLES = [
  'Rohit_JPR','Aakash_07','Vikram_RJ','KingLudo_99','Sandeep_K','Mohit_44',
  'Yash_Banna','Deepak_88','Nikhil_X','Praveen_11','Ankit_777','Harsh_RJ14',
  'Manish_Pro','Karan_09','Rahul_Boss','Sachin_21','Gaurav_M','Ajay_Star',
  'Pankaj_55','vishal_king','Suresh_VP','Ravi_01','Dinesh_AJM','Bharat_K',
  'Lokesh_RJ','Chetan_777','Mukesh_P','Ramesh_JK','Sunil_Ludo','Amit_G',
  'Pradeep_A','Yogesh_09','Girish_J','Kapil_55','Naresh_M','Tarun_RJ',
  'Vikas_B','Hemant_L','Ajit_K','Mahesh_RJ','Brijesh_A','Sumit_11',
  'Nitin_Pro','Hitesh_G','Lalit_J','Sanjay_R','Vinod_K','Pawan_777',
  'Kuldeep_RJ','Jitendra_A',
];

const BET_AMOUNTS = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 5000];
const MODES = ['Classic', '1 Kill', 'Quick', 'Popular'];
const PLAYER_COUNTS = [2, 4];

export const COMMISSION = 0.05; // 5%

export const calcPrize = (bet, players) =>
  Math.floor(bet * players * (1 - COMMISSION));

export const randomHandle = (exclude = '') => {
  let h;
  do { h = INDIAN_HANDLES[Math.floor(Math.random() * INDIAN_HANDLES.length)]; }
  while (h === exclude);
  return h;
};

export const randomBet = () => BET_AMOUNTS[Math.floor(Math.random() * BET_AMOUNTS.length)];
export const randomMode = () => MODES[Math.floor(Math.random() * MODES.length)];

const TICKERS = [
  (h, b, m) => `🎲 ${h} ne ₹${b} ki ${m} bet lagayi!`,
  (h, b, m, opp) => `🏆 ${h} just WON ₹${calcPrize(b,2)} against ${opp} (${m})!`,
  (h, b) => `⚡ ${h} withdrew ₹${b * 2 - Math.floor(b*2*COMMISSION*0.5)} Winning Cash via UPI!`,
  (h, b, m) => `🔥 ${h} accepted ₹${b} ${m} Ludo Battle!`,
  (h, b, m) => `💰 ${h} posted a ₹${b} ${m} open challenge!`,
  (h, b, m, opp) => `🎮 ${h} vs ${opp} · ₹${b} ${m} · Battle LIVE!`,
  (h, b) => `✅ ${h} verified win screenshot — ₹${calcPrize(b,2)} credited!`,
];

export const generateTicker = () => {
  const h = randomHandle();
  const opp = randomHandle(h);
  const b = randomBet();
  const m = randomMode();
  const fn = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  return fn(h, b, m, opp);
};

export const generateFakeBattle = (status = 'open') => {
  const creator = randomHandle();
  const opponent = randomHandle(creator);
  const bet = randomBet();
  const mode = randomMode();
  const players = PLAYER_COUNTS[Math.floor(Math.random() * PLAYER_COUNTS.length)];
  const prize = calcPrize(bet, players);
  const id = `fake-${Math.random().toString(36).slice(2)}`;
  const timeAgo = Math.floor(Math.random() * 300) + 30; // 30-330s ago
  return { id, creator, opponent, bet, mode, players, prize, status, timeAgo };
};

export const generateWinner = () => {
  const winner = randomHandle();
  const loser = randomHandle(winner);
  const bet = randomBet();
  const mode = randomMode();
  const prize = calcPrize(bet, 2);
  const minsAgo = Math.floor(Math.random() * 25) + 1;
  return { winner, loser, bet, prize, mode, minsAgo };
};

export const generateLiveFeed = (count = 12) => ({
  battles: Array.from({ length: count }, (_, i) =>
    generateFakeBattle(i < 4 ? 'open' : i < 9 ? 'live' : 'completed')
  ),
  winners: Array.from({ length: 8 }, () => generateWinner()),
  ticker: generateTicker(),
  onlinePlayers: 120 + Math.floor(Math.random() * 80),
});
