package blocksync

type ConfirmationTier string

const (
	Instant   ConfirmationTier = "instant"
	Fast      ConfirmationTier = "fast"
	Safe      ConfirmationTier = "safe"
	Finalized ConfirmationTier = "finalized"
)

type ChainConfirmationTiers map[ConfirmationTier]uint64

// TODO: fetch from GitHub / other easily accessible configs store?
var DefaultChainConfirmationTiers = map[uint64]ChainConfirmationTiers{
	1: {
		Instant:   1,
		Fast:      5,
		Safe:      32,
		Finalized: 64,
	},
	56: {
		Instant:   1,
		Fast:      15,
		Safe:      30,
		Finalized: 40,
	},
	204: {
		Instant:   1,
		Fast:      10,
		Safe:      20,
		Finalized: 30,
	},
	137: {
		Instant:   1,
		Fast:      64,
		Safe:      128,
		Finalized: 256,
	},
	43114: {
		Instant:   1,
		Fast:      3,
		Safe:      5,
		Finalized: 10,
	},
	250: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	42161: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	10: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	25: {
		Instant:   1,
		Fast:      5,
		Safe:      10,
		Finalized: 20,
	},
	100: {
		Instant:   1,
		Fast:      20,
		Safe:      30,
		Finalized: 50,
	},
	42220: {
		Instant:   1,
		Fast:      20,
		Safe:      30,
		Finalized: 50,
	},
	324: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	8453: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	1284: {
		Instant:   1,
		Fast:      5,
		Safe:      10,
		Finalized: 20,
	},
	1285: {
		Instant:   1,
		Fast:      5,
		Safe:      10,
		Finalized: 20,
	},
	88888: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	1329: {
		Instant:   1,
		Fast:      5,
		Safe:      10,
		Finalized: 20,
	},
	59144: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
	534352: {
		Instant:   1,
		Fast:      1,
		Safe:      1,
		Finalized: 1,
	},
}

var DefaultConfirmationTiers = ChainConfirmationTiers{
	Instant:   1,
	Fast:      5,
	Safe:      10,
	Finalized: 20,
}
