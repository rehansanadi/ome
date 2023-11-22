

exports.homeRoutes = (req, res) => {
  res.render("index.ejs");
};

exports.video_chat = (req, res) => {
    res.render("video_chat.ejs");
  };

  exports.text_chat = (req, res) => {
    res.render("text_chat.ejs");
  };