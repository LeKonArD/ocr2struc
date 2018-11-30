#! /usr/bin/python3

import sys

from itertools import *
from functools import *

from parsefile import *

files = list(sys.argv[1:])

if len(files) == 0:
    print("Aufruf: parse_structure.py DATEI...")
    exit(1)

parsed_lines = reduce(list.__add__, map(parse_file, files))
parsed_lines.sort(key=(lambda x: x.ay))
parsed_lines.sort(key=(lambda x: x.pagenum))

for line in parsed_lines:
    print(line.text)
