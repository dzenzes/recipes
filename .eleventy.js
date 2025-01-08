import pluginNavigation from "@11ty/eleventy-navigation";
import { execSync } from "child_process";

import { Recipe } from "@cooklang/cooklang-ts";
import EleventyPluginOgImage from "eleventy-plugin-og-image";
import fs from "fs";
import htmlmin from "html-minifier-terser";

const now = String(Date.now());

const frontmatterRegex = /^(-{3}\n)(.*\n)*(\-{3})$/gm;
let config = {};

const cookExtension = {
  getData: async function (inputPath) {
    const content = fs.readFileSync(inputPath, "utf-8");
    const charsToTrim = content.match(frontmatterRegex)[0].length;
    // Trim out frontmatter
    const trimmedString = content.substring(charsToTrim);

    // Parse recipe using cooklang-ts
    const recipe = new Recipe(trimmedString);

    let steps = [];
    let ingredients = [];
    let cookware = [];
    const recipeTags = recipe?.metadata?.tags?.split(",") || [];

    function getStepTokenHTML(token) {
      const { quantity, units, name, value, type } = token;
      let tagContent = "";

      if (token.type == "timer") {
        tagContent = `${quantity} ${units}`;
      } else {
        tagContent = token.name || token.value;
      }

      if (config.outputHtml) {
        return `<span class="recipe--${type}">${tagContent}</span>`;
      } else {
        return `${tagContent}`;
      }
    }

    recipe.steps.forEach((stepTokens, i) => {
      if (!steps[i]) steps[i] = [];

      stepTokens.forEach((token) => {
        if (token.type == "ingredient") {
          let { name, quantity, units } = token;

          if (
            config.limitIngredientDecimals &&
            !isNaN(config.limitIngredientDecimals)
          ) {
            const decimalPlaces = parseInt(config.limitIngredientDecimals);
            // Parsing float twice removes any trailing 0s
            quantity = parseFloat(parseFloat(quantity).toFixed(decimalPlaces));
          }
          ingredients.push({ name, quantity, units });
        }

        if (token.type == "cookware") {
          const { name } = token;
          cookware.push({ name });
        }

        steps[i].push(getStepTokenHTML(token));
      });
    });

    return {
      recipe,
      steps,
      ingredients,
      cookware,
      recipeTags,
    };
  },
  compile: async (inputContent) => {
    // We probably don't need the raw content but it's here if we want
    return async () => {
      return inputContent;
    };
  },
};

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.addTemplateFormats("cook");
  eleventyConfig.addExtension("cook", cookExtension);

  eleventyConfig.addPlugin(EleventyPluginOgImage, {
    satoriOptions: {
      fonts: [
        {
          name: "Inter",
          data: fs.readFileSync("./fonts/Inter-Regular.ttf"),
          weight: 700,
          style: "normal",
        },
      ],
    },
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
      .filter((i) => i.data.layout === "pages/recipe.njk")
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

  eleventyConfig.addFilter("filterSharablePages", (pages) =>
    pages.filter((page) => page.data.layout)
  );

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
  eleventyConfig.watchIgnores.add("src/assets/images/social/**/*");
  eleventyConfig.addPassthroughCopy({ "./_tmp/style.css": "./style.css" });
  eleventyConfig.addPassthroughCopy({ "./src/assets": "/" });

  eleventyConfig.addShortcode("version", function () {
    return now;
  });

  eleventyConfig.addTransform("htmlmin", function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });

      return minified;
    }
    return content;
  });

  eleventyConfig.on("eleventy.after", () => {
    execSync(`npx pagefind --site _site --glob \"**/*.html\"`, {
      encoding: "utf-8",
    });
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
}
