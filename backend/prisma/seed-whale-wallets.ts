import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KNOWN_WALLETS = [
  // Bitcoin - Binance
  { address: '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', blockchain: 'bitcoin', ownerName: 'Binance Cold Wallet 1', ownerType: 'exchange', exchange: 'BINANCE' },
  { address: '3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', blockchain: 'bitcoin', ownerName: 'Binance Cold Wallet 8', ownerType: 'exchange', exchange: 'BINANCE' },
  { address: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', blockchain: 'bitcoin', ownerName: 'Binance Hot Wallet', ownerType: 'exchange', exchange: 'BINANCE' },

  // Bitcoin - Coinbase
  { address: '3LCGsSmfr24demGvriN4e3D3Lbrkn6Qh8e', blockchain: 'bitcoin', ownerName: 'Coinbase Cold Wallet', ownerType: 'exchange', exchange: 'COINBASE' },
  { address: '36PrZ1KHYMpqSyAQXSG8VwbUiq2EogxLo2', blockchain: 'bitcoin', ownerName: 'Coinbase Hot Wallet 1', ownerType: 'exchange', exchange: 'COINBASE' },

  // Bitcoin - Kraken
  { address: '3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', blockchain: 'bitcoin', ownerName: 'Kraken Exchange', ownerType: 'exchange', exchange: 'KRAKEN' },
  { address: 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97', blockchain: 'bitcoin', ownerName: 'Kraken Cold Wallet', ownerType: 'exchange', exchange: 'KRAKEN' },

  // Bitcoin - Bitfinex
  { address: '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', blockchain: 'bitcoin', ownerName: 'Bitfinex Cold Wallet', ownerType: 'exchange', exchange: 'BITFINEX' },

  // Bitcoin - Huobi
  { address: '3Nxwenay9Z8Lc9JBiywExpnEFiLp6Afp8v', blockchain: 'bitcoin', ownerName: 'Huobi Cold Wallet', ownerType: 'exchange', exchange: 'HUOBI' },

  // Ethereum - Binance
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', blockchain: 'ethereum', ownerName: 'Binance Hot Wallet', ownerType: 'exchange', exchange: 'BINANCE' },
  { address: '0x28C6c06298d514Db089934071355E5743bf21d60', blockchain: 'ethereum', ownerName: 'Binance Cold Wallet 14', ownerType: 'exchange', exchange: 'BINANCE' },
  { address: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549', blockchain: 'ethereum', ownerName: 'Binance Cold Wallet 16', ownerType: 'exchange', exchange: 'BINANCE' },

  // Ethereum - Coinbase
  { address: '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3', blockchain: 'ethereum', ownerName: 'Coinbase Cold Wallet', ownerType: 'exchange', exchange: 'COINBASE' },
  { address: '0x503828976D22510aad0201ac7EC88293211D23Da', blockchain: 'ethereum', ownerName: 'Coinbase Hot Wallet', ownerType: 'exchange', exchange: 'COINBASE' },

  // Ethereum - Kraken
  { address: '0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2', blockchain: 'ethereum', ownerName: 'Kraken Hot Wallet', ownerType: 'exchange', exchange: 'KRAKEN' },
  { address: '0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0', blockchain: 'ethereum', ownerName: 'Kraken Cold Wallet', ownerType: 'exchange', exchange: 'KRAKEN' },

  // Ethereum - Bitfinex
  { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', blockchain: 'ethereum', ownerName: 'Bitfinex Hot Wallet', ownerType: 'exchange', exchange: 'BITFINEX' },
  { address: '0x876EabF441B2EE5B5b0554Fd502a8E0600950cFa', blockchain: 'ethereum', ownerName: 'Bitfinex Cold Wallet', ownerType: 'exchange', exchange: 'BITFINEX' },

  // Ethereum - Huobi
  { address: '0x6748F50f686bfbcA6Fe8ad62b22228b87F31ff2b', blockchain: 'ethereum', ownerName: 'Huobi Hot Wallet', ownerType: 'exchange', exchange: 'HUOBI' },
  { address: '0xAB5C66752a9e8167967685F1450532fB96d5d24f', blockchain: 'ethereum', ownerName: 'Huobi Cold Wallet', ownerType: 'exchange', exchange: 'HUOBI' },

  // Ethereum - OKX
  { address: '0x98ec059Dc3aDfBdd63429454aEB0c990FDA4a1A5', blockchain: 'ethereum', ownerName: 'OKX Hot Wallet', ownerType: 'exchange', exchange: 'OKX' },
  { address: '0x236F9F97e0E62388479bf9E5BA4889e46B0273C3', blockchain: 'ethereum', ownerName: 'OKX Cold Wallet', ownerType: 'exchange', exchange: 'OKX' },
];

async function main() {
  console.log('Starting whale wallet seed...');

  for (const wallet of KNOWN_WALLETS) {
    await prisma.whaleWallet.upsert({
      where: { address: wallet.address },
      create: {
        ...wallet,
        isVerified: true,
        source: 'manual-seed',
      },
      update: {},
    });
  }

  console.log(`✓ Seeded ${KNOWN_WALLETS.length} exchange wallets`);
  console.log(`  - ${KNOWN_WALLETS.filter(w => w.blockchain === 'bitcoin').length} Bitcoin wallets`);
  console.log(`  - ${KNOWN_WALLETS.filter(w => w.blockchain === 'ethereum').length} Ethereum wallets`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
