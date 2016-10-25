NUCLEUS=$(shell which nucleus-tiny)
FILES=$(shell find . -type f -name '*.js' | grep -v eslintrc)

server: ${NUCLEUS} bundle.zip
	cat $^ > $@
	chmod +x $@

bundle.zip: ${FILES}
	rm -f $@
	zip -9 $@ $^

clean:
	rm -f bundle.zip server
