import pluginNavigation from "@11ty/eleventy-navigation";
import { execSync } from "child_process";
import eleventyPluginCookLang from "eleventy-plugin-cooklang";
import EleventyPluginOgImage from "eleventy-plugin-og-image";
import fs from "fs";
import htmlmin from "html-minifier";

const now = String(Date.now());
export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(eleventyPluginCookLang, {
    limitIngredientDecimals: 2,
  });
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

  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_PRODUCTION &&
      outputPath &&
      outputPath.endsWith(".html")
    ) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
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
