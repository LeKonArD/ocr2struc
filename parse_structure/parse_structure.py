#! /usr/bin/python3

import sys
import logging
import copy
import argparse
import os

from lxml import etree

from itertools import *
from functools import *

from parsefile import *

logging.getLogger().setLevel(logging.DEBUG)

parser = argparse.ArgumentParser()
parser.add_argument('-input', required=True, metavar='FILE', nargs='+', type=argparse.FileType('r'))
parser.add_argument('-output', required=False, type=argparse.FileType('w'), default=sys.stdout)
args = parser.parse_args()


# Einlesen der Dateien, Sortieren
parsed_lines = reduce(list.__add__, map(parse_file, args.input))
parsed_lines.sort(key=(lambda x: x.ax))
parsed_lines.sort(key=(lambda x: x.ay))
parsed_lines.sort(key=(lambda x: x.page.filename))


# Transduktion der Zielelemente
output = list()

counter = 0
current_page = None
last_line = None

for line in parsed_lines:

    counter = counter + 1
    if current_page == None or current_page != line.page:
        output.append(PageBreak(line.page))
        current_page = line.page
        space = VerticalSpace(line.ay, line.page)
        space.annotations["id"] = counter
        space.annotations["pos"] = "%d,%d %d,%d" % (0, 0, line.ax, line.ay)
    else:
        offset = line.ay - last_line.by
        space = VerticalSpace(offset, line.page)
        space.annotations["id"] = counter
        space.annotations["pos"] = "%d,%d %d,%d" % (last_line.bx, last_line.by, line.ax, line.ay)

    counter = counter + 1
    line.annotations["id"] = counter

    output.append(space)
    output.append(line)
    last_line = line


# Konstruktion der Output-XML
root = etree.Element("Document")
for o in output:
    root.append(o.toelem())

outstr = etree.tostring(root, pretty_print=True, encoding='utf-8', xml_declaration=True).decode('utf-8')
args.output.write(outstr)
