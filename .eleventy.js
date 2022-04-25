const eleventyPluginCookLang = require("eleventy-plugin-cooklang");
const pluginNavigation = require("@11ty/eleventy-navigation");

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
      .sort((recipeA, recipeB) => {
        return recipeA.date - recipeB.date;
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
        return `${name}, ${quantity} ${units} `;
      }
    }
  );
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
