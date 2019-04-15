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
parser.add_argument('--page-offset', metavar='N', type=int, default=1, help='Erstes pb-Element startet mit Seitenzahl N')
parser.add_argument('--title-stmt', metavar='XMLSTR', type=str, nargs='?', help='Inhalt für das Element <titleStmt> im teiCorpus-Header')
parser.add_argument('--publication-stmt', metavar='XMLSTR', type=str, nargs='?', help='Inhalt für das Element <publicationStmt> im teiCorpus-Header')
parser.add_argument('--source-desc', metavar='XMLSTR', type=str, nargs='?', help='Inhalt für das Element <sourceDesc> im teiCorpus-Header')
args = parser.parse_args()


logging.info('Parsing file %s' % args.input.name)
tree = etree.parse(args.input)
elements = tree.xpath('/Document/*')

# Schreibe Basis-TEI
writer = TeiWriter()
writer.page_counter = args.page_offset
writer.process(elements)

# Passe titleStmt/publicationStmt/sourceDesc des teiCorpus-Headers an
def supply_header(header_tag, header_str):
    try:
        xmlstr ='<root>{0}</root>'.format(header_str)
        root_el = etree.fromstring(xmlstr)
        writer.file_desc.find(header_tag).clear()
        for el in root_el:
            writer.file_desc.find(header_tag).append(el)
    except etree.XMLSyntaxError as err:
        logging.error('Supplied %s \'%s\'could not be parsed: %s', header_tag, xmlstr, str(err))

if (args.publication_stmt is not None):
    supply_header('publicationStmt', args.publication_stmt)
if (args.title_stmt is not None):
    supply_header('titleStmt', args.title_stmt)
if (args.source_desc is not None):
    supply_header('sourceDesc', args.source_desc)


outstr = etree.tostring(writer.root, pretty_print=True, encoding='utf-8', xml_declaration=True).decode('utf-8')
args.output.write(outstr)
