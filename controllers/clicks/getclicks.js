const Click  = require("../../models/clicks");

const getClicks = async (req, res) => {
    const clicks = await Click.find();
    res.json(clicks);
};

const filterClicksByKeyword = async (req, res) => {
    const { keyword } = req.params;
    const clicks = await Click.find({ keyword });
    res.json(clicks);
};

export default getClicks;