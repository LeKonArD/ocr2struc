#! /usr/bin/python3

import sys
import logging
import argparse

from lxml import etree

from teiwriter import TeiWriter

logging.getLogger().setLevel(logging.DEBUG)

parser = argparse.ArgumentParser()
parser.add_argument('input', metavar='IN', type=argparse.FileType('r'))
parser.add_argument('output', metavar='OUT', nargs='?', type=argparse.FileType('w'), default=sys.stdout)
args = parser.parse_args()


logging.info('Parsing file %s' % args.input.name)
tree = etree.parse(args.input)
elements = tree.xpath('/Document/*')

writer = TeiWriter()
writer.process(elements)

outstr = etree.tostring(writer.root, pretty_print=True, encoding='utf-8', xml_declaration=True).decode('utf-8')
args.output.write(outstr)
