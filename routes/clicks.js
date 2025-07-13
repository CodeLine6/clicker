const { default: getClicks } = require("../controllers/clicks/GetClicks");

const router = express.Router();

router.get("/", getClicks);

module.exports = router