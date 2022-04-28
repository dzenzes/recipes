const eleventyPluginCookLang = require("eleventy-plugin-cooklang");
const pluginNavigation = require("@11ty/eleventy-navigation");
const htmlmin = require("html-minifier");
const now = String(Date.now());
module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(eleventyPluginCookLang, {
    limitIngredientDecimals: 2,
  });

  eleventyConfig.addFilter("tagUrl", function (tag) {
    return `/tags/${tag.toLowerCase()}`;
  });

  eleventyConfig.addFilter("formatTag", function (tag) {
    const lowercaseTag = `${tag.toLowerCase()}`;
    return lowercaseTag.slice(0, 1).toUpperCase() + lowercaseTag.slice(1);
  });

  eleventyConfig.addCollection("recipes", function (collectionApi) {
    return collectionApi
      .getAll()
      .filter((i) => i.data.layout == "pages/recipe.njk")
      .sort((a, b) => {
        return a.data.title > b.data.title ? 1 : -1;
      });
  });

  function filterTagList(tags) {
    return (tags || []).filter(
      (tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1
    );
  }

  eleventyConfig.addFilter("filterTagList", filterTagList);

  // Create an array of all tags
  eleventyConfig.addCollection("tagList", function (collection) {
    let tagSet = new Set();
    collection.getAll().forEach((item) => {
      (item.data.tags || []).forEach((tag) => tagSet.add(tag));
    });

    return filterTagList([...tagSet]);
  });
  eleventyConfig.addShortcode(
    "ingredient",
    function ({ name, quantity, units }) {
      if (isNaN(quantity)) {
        return name;
      } else {
        return `${name}, ${quantity} ${units ? units : ""} `;
      }
    }
  );

  eleventyConfig.addWatchTarget("./styles/tailwind.config.js");
  eleventyConfig.addWatchTarget("./styles/tailwind.css");

  eleventyConfig.addPassthroughCopy({ "./_tmp/style.css": "./style.css" });
  // eleventyConfig.addPassthroughCopy({ "./src/*.cook": "./" });
  eleventyConfig.addPassthroughCopy({ "./src/assets/favicon.ico": "/" });

  eleventyConfig.addShortcode("version", function () {
    return now;
  });
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_PRODUCTION &&
      outputPath &&
      outputPath.endsWith(".html")
    ) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });
  return {
    dir: {
      input: "src",
      output: "_site",
    },
    passthroughFileCopy: true,
    templateFormats: ["html", "md", "njk", "cook"],
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
