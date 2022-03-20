/**
 * This code was adapted from https://github.com/codewitch-honey-crisis/gfx/blob/master/tools/bingen.cpp
 * All credit to codewitch-honey-crisis for the idea and project.
 */

import chunk from 'lodash.chunk';
import sharp from 'sharp';
import { program } from 'commander';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { basename, extname } from 'path';

const generateHeader = (bytes, identifier) => {
  const chunkedArray = chunk(Array.from(bytes), 10);
  const byteString = chunkedArray
    .map((array) =>
      array.map((byte) => `0x${byte.toString(16).padStart(2, '0')}`).join(', ')
    )
    .join(',\n\t');

  return `
#ifndef ${identifier}_HPP
#define ${identifier}_HPP
#include <stdint.h>
#include <io_stream.hpp>
#ifndef PROGMEM
#define PROGMEM
#endif
static const uint8_t ${identifier}_bin[] PROGMEM = {
  ${byteString}
};
static ::io::const_buffer_stream ${identifier}_stream(
  ${identifier}_bin,${bytes.length});
#endif // ${identifier}_HPP
`;
};

const generateIdentifier = (filename) =>
  basename(filename, extname(filename)).replace(/[^\w\d]/g, '_');

program
  .command('convert <bitmap> <header>', { isDefault: true })
  .action(async (bitmap, header) => {
    if (!existsSync(bitmap)) {
      return console.error(`${bitmap} could not be found!`);
    } else if (existsSync(header)) {
      return console.error(`Unwilling to overwrite ${header}`);
    }

    try {
      const { data, info } = await sharp(bitmap)
        .jpeg()
        .toBuffer({ resolveWithObject: true });

      if (info.channels > 3) {
        return console.error('No support for alpha channel');
      }

      console.log(
        `Processing image of size ${info.width}x${info.height} with ${info.channels} channels`
      );

      await writeFile(header, generateHeader(data, generateIdentifier(bitmap)));
    } catch (error) {
      console.error('Failed to convert bitmap into header!');
      return console.error(error);
    }
  });

program.parse();
